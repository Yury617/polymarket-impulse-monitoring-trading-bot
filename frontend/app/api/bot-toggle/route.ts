import { NextResponse } from "next/server";
import { getMongoDB } from "@/lib/db";

type BotMetaDoc = { _id: string; config?: unknown; enabled?: boolean; updatedAt?: Date };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const enabled = body.enabled === true || body.enabled === "true" || body.enabled === 1;

    const db = await getMongoDB();
    await db.collection<BotMetaDoc>("impulse_bot_meta").updateOne(
      { _id: "enabled" },
      { $set: { enabled: enabled === true, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    console.error("[api/bot-toggle]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
