import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, responses, aiEvaluations, insightsCache } from "@/lib/db/client";
import { SAMPLE_VENDORS } from "@/lib/sample/content";

// Maintenance (coordinator only): exports the current AI evaluations and committee
// themes for the sample vendors in the shape of src/lib/sample/demo-snapshot.json.
// Use after changing the sample content: reset, re-run the AI on each vendor, open
// Insights once, then save this output over demo-snapshot.json.
export async function GET() {
  const session = await auth();
  if (session?.user.role !== "coordinator") {
    return NextResponse.json({ error: "Coordinator only" }, { status: 403 });
  }
  const names = SAMPLE_VENDORS.map((v) => v.name);
  const rows = await db.select().from(responses).where(inArray(responses.vendorName, names));
  const ai: Record<string, unknown> = {};
  const themes: Record<string, unknown> = {};
  for (const r of rows) {
    const [a] = await db.select().from(aiEvaluations).where(eq(aiEvaluations.responseId, r.id));
    if (a) ai[r.vendorName] = { scores: a.scores, result: a.result, model: a.model };
    const [t] = await db.select().from(insightsCache).where(eq(insightsCache.key, `themes:${r.id}`));
    if (t) themes[r.vendorName] = t.payload;
  }
  return NextResponse.json({ ai, themes });
}
