import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateOne } from "@/lib/jobs/evaluate";
import { describeAiError } from "@/lib/ai/client";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "coordinator") {
    return NextResponse.json({ ok: false, error: "Coordinator only" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const responseId = Number(id);
  if (!Number.isFinite(responseId)) {
    return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    const r = await evaluateOne(responseId, { force });
    return NextResponse.json({ ok: true, cached: r.cached });
  } catch (e) {
    console.error(`[ai] evaluation failed for ${responseId}:`, e);
    return NextResponse.json({ ok: false, error: describeAiError(e) }, { status: 500 });
  }
}
