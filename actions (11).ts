"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, rfpSettings, responses, judgeScores, type MandatoryStatus } from "@/lib/db/client";
import { requireCoordinator, requireJudge } from "@/lib/auth";
import { CRITERION_IDS } from "@/lib/criteria";
import { isAllowedUrl, loadFile } from "@/lib/files/storage";
import { countUnits, PRICING_EXTS, RESPONSE_EXTS } from "@/lib/files/extract";
import { evaluateOne } from "@/lib/jobs/evaluate";
import { aiConfigured } from "@/lib/ai/client";

type Result = { ok: true } | { ok: false; error: string };

export async function setResultsPublished(next: boolean): Promise<Result> {
  await requireCoordinator();
  await db
    .update(rfpSettings)
    .set({ resultsPublished: next })
    .where(eq(rfpSettings.id, 1));
  revalidatePath("/", "layout");
  return { ok: true };
}

const responseSchema = z.object({
  id: z.number().int().positive().optional(),
  vendorName: z.string().trim().min(2, "Vendor name is required").max(120),
  contactName: z.string().trim().max(120).optional().default(""),
  contactEmail: z.union([z.literal(""), z.string().trim().email("Contact email looks invalid")]).default(""),
  summary: z.string().max(4000).default(""),
  responseFile: z.object({ url: z.string(), name: z.string() }),
  pricingFile: z.object({ url: z.string(), name: z.string() }),
  runAi: z.boolean().default(true),
});

function hasExt(name: string, exts: string[]) {
  const n = name.toLowerCase();
  return exts.some((e) => n.endsWith(e));
}

export async function saveVendorResponse(input: z.input<typeof responseSchema>): Promise<Result> {
  const u = await requireCoordinator();
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;

  for (const f of [d.responseFile, d.pricingFile]) {
    if (!isAllowedUrl(f.url)) return { ok: false, error: "Unrecognized file location — please re-upload." };
  }
  if (!hasExt(d.responseFile.name, RESPONSE_EXTS)) {
    return { ok: false, error: "The RFP response must be a PowerPoint (.pptx) or PDF deck." };
  }
  if (!hasExt(d.pricingFile.name, PRICING_EXTS)) {
    return { ok: false, error: "The pricing sheet must be .xlsx, .csv, .pdf or .pptx." };
  }

  let pageCount: number | null = null;
  try {
    const f = await loadFile(d.responseFile.url, d.responseFile.name);
    pageCount = await countUnits(f.bytes, d.responseFile.name, f.contentType);
  } catch (e) {
    return { ok: false, error: `Could not read the response deck: ${e instanceof Error ? e.message : e}` };
  }

  const values = {
    vendorName: d.vendorName,
    contactName: d.contactName || null,
    contactEmail: d.contactEmail || null,
    summary: d.summary,
    responseFileUrl: d.responseFile.url,
    responseFileName: d.responseFile.name,
    responsePageCount: pageCount,
    pricingFileUrl: d.pricingFile.url,
    pricingFileName: d.pricingFile.name,
  };

  let id: number;
  if (d.id) {
    const [row] = await db
      .update(responses)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(responses.id, d.id))
      .returning({ id: responses.id });
    if (!row) return { ok: false, error: "Response not found" };
    id = row.id;
  } else {
    const [row] = await db
      .insert(responses)
      .values({ ...values, uploadedByUserId: u.id })
      .returning({ id: responses.id });
    id = row.id;
  }

  if (d.runAi && aiConfigured()) {
    after(async () => {
      try {
        await evaluateOne(id);
      } catch (e) {
        console.error(`[ai] background evaluation failed for ${id}:`, e);
      }
    });
  }
  revalidatePath("/evaluate");
  redirect(`/evaluate/${id}?uploaded=1`);
}

export async function deleteVendorResponse(id: number): Promise<Result> {
  await requireCoordinator();
  await db.delete(responses).where(eq(responses.id, id));
  revalidatePath("/evaluate");
  redirect("/evaluate");
}

export async function saveMandatoryReview(
  id: number,
  review: Record<string, MandatoryStatus | "">
): Promise<Result> {
  await requireCoordinator();
  const clean: Record<string, MandatoryStatus> = {};
  for (const [k, v] of Object.entries(review)) {
    if (v === "pass" || v === "fail" || v === "unclear") clean[k] = v;
  }
  await db.update(responses).set({ mandatoryReview: clean }).where(eq(responses.id, id));
  revalidatePath(`/evaluate/${id}`);
  revalidatePath("/evaluate");
  return { ok: true };
}

const scoreValue = z.union([z.number().int().min(1).max(5), z.null()]);
const scorecardSchema = z.object({
  responseId: z.number().int().positive(),
  scores: z.record(z.string(), scoreValue),
  criterionNotes: z.record(z.string(), z.string().max(4000)),
  notes: z.string().max(8000),
});

export async function saveScorecard(input: z.input<typeof scorecardSchema>): Promise<Result> {
  const u = await requireJudge();
  const parsed = scorecardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Scores must be whole numbers from 1 to 5." };
  const d = parsed.data;
  const scores: Record<string, number | null> = {};
  const notes: Record<string, string> = {};
  for (const id of CRITERION_IDS) {
    scores[id] = d.scores[id] ?? null;
    if (d.criterionNotes[id]?.trim()) notes[id] = d.criterionNotes[id].trim();
  }
  await db
    .insert(judgeScores)
    .values({ responseId: d.responseId, judgeUserId: u.id, scores, criterionNotes: notes, notes: d.notes })
    .onConflictDoUpdate({
      target: [judgeScores.responseId, judgeScores.judgeUserId],
      set: { scores, criterionNotes: notes, notes: d.notes, updatedAt: sql`now()` },
    });
  revalidatePath(`/evaluate/${d.responseId}`);
  revalidatePath("/evaluate");
  return { ok: true };
}
