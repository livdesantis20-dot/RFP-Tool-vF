import { NextResponse } from "next/server";
import { evaluateMissing } from "@/lib/jobs/evaluate";
import { ensureDb } from "@/lib/db/client";

export const maxDuration = 300;

// Daily safety net (vercel.json): evaluates any response the AI hasn't read yet.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDb();
  return NextResponse.json({ ok: true, results: await evaluateMissing() });
}
