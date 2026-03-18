import { NextResponse } from "next/server";
import { getMongoDB } from "@/lib/db";

type BotMetaDoc = { _id: string; config?: unknown; enabled?: boolean; updatedAt?: Date };

export async function GET() {
  try {
    const db = await getMongoDB();
    const doc = await db.collection<BotMetaDoc>("impulse_bot_meta").findOne({ _id: "enabled" });
    const enabled = doc?.enabled === true;
    return NextResponse.json({ enabled });
  } catch (err) {
    console.error("[api/bot-enabled]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
