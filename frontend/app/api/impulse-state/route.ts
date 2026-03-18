import { NextResponse } from "next/server";
import { getMongoDB } from "@/lib/db";

type PricePoint = { ts: number; price: number };
type BotMetaDoc = { _id: string; config?: unknown; enabled?: boolean; updatedAt?: Date } & Record<string, unknown>;
type PriceRow = { ts: number; price: number };

function detectImpulsesMinLookback(
  history: PricePoint[],
  side: string,
  config: { limitPrice: number; minJump: number; lookbackSec: number },
  existingTs: Set<number>
): Array<{ ts: number; price: number; side: string; time: string }> {
  if (history.length < 2) return [];

  const satisfiesAt = (idx: number): boolean => {
    const p = history[idx];
    const cutoff = p.ts - config.lookbackSec;
    let min = Infinity;
    let count = 0;
    for (let i = 0; i <= idx; i++) {
      const h = history[i];
      if (h.ts < cutoff) continue;
      count++;
      if (h.price < min) min = h.price;
    }
    if (count < 2 || !Number.isFinite(min)) return false;
    return p.price >= config.limitPrice && p.price - min >= config.minJump;
  };

  const out: Array<{ ts: number; price: number; side: string; time: string }> = [];
  for (let i = 0; i < history.length; i++) {
    if (!satisfiesAt(i)) continue;
    if (i > 0 && satisfiesAt(i - 1)) continue; // edge-trigger

    const ts = history[i].ts;
    // don't duplicate real buys; also de-dupe near any existing marker
    const nearExisting = [...existingTs].some((t) => Math.abs(t - ts) <= 3);
    if (nearExisting) continue;

    existingTs.add(ts);
    out.push({ ts, price: history[i].price, side, time: new Date(ts * 1000).toLocaleTimeString() });
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("includeHistory") === "1";

    const db = await getMongoDB();
    const stateDoc = await db.collection<BotMetaDoc>("impulse_bot_meta").findOne({ _id: "state" });
    const state = stateDoc ? ({ ...stateDoc } as Record<string, unknown>) : null;

    if (!state) {
      return NextResponse.json({
        upPrice: null,
        downPrice: null,
        position: null,
        conditionId: null,
        upTokenId: null,
        downTokenId: null,
        marketStartTime: null,
        marketEndTime: null,
        priceHistory: null,
        impulseEvents: [],
        walletBalanceUsd: null,
        positionValueUsd: null,
      });
    }

    let priceHistory: { up: { ts: number; price: number }[]; down: { ts: number; price: number }[] } | null = null;
    let impulseEvents: { ts: number; price: number; side: string; time: string }[] = [];

    if (includeHistory && state.upTokenId && state.downTokenId) {
      // Fetch enough points to cover the visible market window (fallback to 15m).
      const windowSeconds = typeof state.marketStartTime === "number" && typeof state.marketEndTime === "number"
        ? Math.max(60, state.marketEndTime - state.marketStartTime)
        : 900;
      const cutoff = Date.now() / 1000 - windowSeconds - 30;

      const [upRows, downRows] = await Promise.all([
        db
          .collection("impulse_bot_prices")
          .find({ tokenId: state.upTokenId, ts: { $gte: cutoff } }, { projection: { _id: 0, ts: 1, price: 1 } })
          .sort({ ts: 1 })
          .toArray(),
        db
          .collection("impulse_bot_prices")
          .find({ tokenId: state.downTokenId, ts: { $gte: cutoff } }, { projection: { _id: 0, ts: 1, price: 1 } })
          .sort({ ts: 1 })
          .toArray(),
      ]);
      priceHistory = {
        up: (upRows as unknown as PriceRow[]).map((r) => ({ ts: r.ts, price: r.price })),
        down: (downRows as unknown as PriceRow[]).map((r) => ({ ts: r.ts, price: r.price })),
      };
    }

    if (state.conditionId) {
      const buys = await db
        .collection("impulse_buys")
        .find({ conditionId: state.conditionId })
        .sort({ boughtAt: 1 })
        .toArray();
      impulseEvents = (buys as unknown as Array<{ boughtAt: number; price: number; side: string }>).map((b) => ({
        ts: b.boughtAt,
        price: b.price,
        side: b.side,
        time: new Date(b.boughtAt * 1000).toLocaleTimeString(),
      }));
    }

    if (priceHistory && priceHistory.up.length > 0 && priceHistory.down.length > 0) {
      const configDoc = await db.collection<BotMetaDoc>("impulse_bot_meta").findOne({ _id: "config" });
      const cfg = (configDoc?.config ?? {}) as { limitPrice?: number; minJump?: number; lookbackSec?: number };
      const config = {
        limitPrice: cfg.limitPrice ?? 0.55,
        minJump: cfg.minJump ?? 0.05,
        lookbackSec: cfg.lookbackSec ?? 60,
      };

      const tsSet = new Set(impulseEvents.map((e) => e.ts));
      const upImpulses = detectImpulsesMinLookback(priceHistory.up, "Up", config, tsSet);
      const downImpulses = detectImpulsesMinLookback(priceHistory.down, "Down", config, tsSet);
      impulseEvents = [...impulseEvents, ...upImpulses, ...downImpulses].sort((a, b) => a.ts - b.ts);
    }

    return NextResponse.json({
      upPrice: state.upPrice ?? null,
      downPrice: state.downPrice ?? null,
      position: state.position ?? null,
      conditionId: state.conditionId ?? null,
      upTokenId: state.upTokenId ?? null,
      downTokenId: state.downTokenId ?? null,
      currentSlug: state.currentSlug ?? null,
      marketStartTime: state.marketStartTime ?? null,
      marketEndTime: state.marketEndTime ?? null,
      priceHistory,
      impulseEvents,
      walletBalanceUsd: typeof state.walletBalanceUsd === "number" ? state.walletBalanceUsd : null,
      positionValueUsd: typeof state.positionValueUsd === "number" ? state.positionValueUsd : null,
    });
  } catch (err) {
    console.error("[api/impulse-state]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
