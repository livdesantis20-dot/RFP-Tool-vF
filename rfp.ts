import { db, ensureDb, rfpSettings, type RfpSettings } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { CRITERIA, type Criterion } from "@/lib/criteria";
import { DEFAULT_RFP } from "@/lib/db/seed";

export async function getRfp(): Promise<RfpSettings> {
  await ensureDb();
  const [row] = await db.select().from(rfpSettings).where(eq(rfpSettings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(rfpSettings)
    .values(DEFAULT_RFP)
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db.select().from(rfpSettings).where(eq(rfpSettings.id, 1)).limit(1);
  return again;
}

// The criteria with this RFP's tailored weights applied (falls back to framework defaults).
export function rubricFor(rfp: Pick<RfpSettings, "weights">): Criterion[] {
  const w = rfp.weights ?? {};
  return CRITERIA.map((c) => ({
    ...c,
    weight: typeof w[c.id] === "number" ? w[c.id] : c.weight,
  }));
}

export function totalWeight(rubric: Criterion[]): number {
  return Number(rubric.reduce((s, c) => s + c.weight, 0).toFixed(4));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
