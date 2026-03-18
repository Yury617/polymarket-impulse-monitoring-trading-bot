import { NextResponse } from "next/server";
import { getMongoDB } from "@/lib/db";

type BotMetaDoc = { _id: string; config?: unknown; enabled?: boolean; updatedAt?: Date };

export async function GET() {
  try {
    const db = await getMongoDB();
    const doc = await db.collection<BotMetaDoc>("impulse_bot_meta").findOne({ _id: "config" });
    if (!doc?.config) {
      return NextResponse.json({
        config: null,
        message: "No config in MongoDB, using env defaults",
      });
    }
    return NextResponse.json({ config: doc.config });
  } catch (err) {
    console.error("[api/bot-config GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = {
      slugPrefix: String(body.slugPrefix ?? body.slug ?? ""),
      windowSeconds: parseInt(body.windowSeconds, 10) || 900,
      limitPrice: parseFloat(body.limitPrice) || 0.55,
      minJump: parseFloat(body.minJump) || 0.05,
      lookbackSec: parseInt(body.lookbackSec, 10) || 60,
      trailingStopPct: parseFloat(body.trailingStopPct) || 5,
      buyAmountUsd: parseFloat(body.buyAmountUsd) || 10,
      pollIntervalMs: parseInt(body.pollIntervalMs, 10) || 2000,
    };

    const db = await getMongoDB();
    await db.collection<BotMetaDoc>("impulse_bot_meta").updateOne(
      { _id: "config" },
      { $set: { config, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[api/bot-config POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
