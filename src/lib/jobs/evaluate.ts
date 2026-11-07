import { eq, isNull, sql } from "drizzle-orm";
import { db, responses, aiEvaluations } from "@/lib/db/client";
import { evaluateVendorResponse } from "@/lib/ai/evaluate";
import { loadFile } from "@/lib/files/storage";
import { getRfp, rubricFor } from "@/lib/rfp";
import { aiConfigured } from "@/lib/ai/client";

// Runs the AI evaluator for one vendor response and stores the result.
// Cached: skipped when the response hasn't changed since the last evaluation
// (unless force). Changing the RFP (weights, documents) also invalidates the cache.
export async function evaluateOne(
  responseId: number,
  opts: { force?: boolean } = {}
): Promise<{ cached: boolean }> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local.");

  const [resp] = await db.select().from(responses).where(eq(responses.id, responseId)).limit(1);
  if (!resp) throw new Error(`Response ${responseId} not found`);
  const rfp = await getRfp();

  if (!opts.force) {
    const [existing] = await db
      .select()
      .from(aiEvaluations)
      .where(eq(aiEvaluations.responseId, responseId))
      .limit(1);
    if (existing && existing.createdAt >= resp.updatedAt && existing.createdAt >= rfp.updatedAt) {
      return { cached: true };
    }
  }

  console.log(`[ai] evaluating response ${responseId} "${resp.vendorName}"`);
  const [rfpDoc, responseFile, pricingFile] = await Promise.all([
    rfp.rfpFileUrl ? loadFile(rfp.rfpFileUrl, rfp.rfpFileName ?? "rfp") : Promise.resolve(null),
    loadFile(resp.responseFileUrl, resp.responseFileName),
    loadFile(resp.pricingFileUrl, resp.pricingFileName),
  ]);
  // Prefer the original upload names (blob URLs carry random suffixes).
  if (rfpDoc && rfp.rfpFileName) rfpDoc.name = rfp.rfpFileName;
  responseFile.name = resp.responseFileName;
  pricingFile.name = resp.pricingFileName;

  const out = await evaluateVendorResponse({
    rfp: {
      clientName: rfp.clientName,
      procurementTitle: rfp.procurementTitle,
      scopeSummary: rfp.scopeSummary,
      issuedDate: rfp.issuedDate,
      responseDueDate: rfp.responseDueDate,
      mandatoryRequirements: rfp.mandatoryRequirements,
      rubric: rubricFor(rfp),
      document: rfpDoc,
    },
    vendor: {
      name: resp.vendorName,
      coordinatorNotes: resp.summary,
      response: responseFile,
      pricing: pricingFile,
    },
  });

  await db
    .insert(aiEvaluations)
    .values({ responseId, scores: out.scores, result: out.evaluation, model: out.model })
    .onConflictDoUpdate({
      target: aiEvaluations.responseId,
      set: { scores: out.scores, result: out.evaluation, model: out.model, createdAt: sql`now()` },
    });
  return { cached: false };
}

export async function evaluateMissing(limit = 10) {
  const rows = await db
    .select({ id: responses.id })
    .from(responses)
    .leftJoin(aiEvaluations, eq(aiEvaluations.responseId, responses.id))
    .where(isNull(aiEvaluations.responseId))
    .limit(limit);
  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const r of rows) {
    try {
      await evaluateOne(r.id);
      results.push({ id: r.id, ok: true });
    } catch (e) {
      results.push({ id: r.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
