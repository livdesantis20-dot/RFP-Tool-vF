import { eq } from "drizzle-orm";
import {
  db,
  responses,
  aiEvaluations,
  judgeScores,
  users,
  type RfpSettings,
  type JudgeScoreRow,
  type ResponseRow,
} from "@/lib/db/client";
import type { AiEvaluation } from "@/lib/ai/evaluate";
import type { Criterion } from "@/lib/criteria";
import { rubricFor } from "@/lib/rfp";
import {
  consensus,
  mandatoryLines,
  mandatoryOverall,
  weighted,
  type MandatoryLine,
  type MandatoryOverall,
  type WeightedResult,
} from "@/lib/scoring";

export type VendorSummary = {
  response: ResponseRow;
  ai: { scores: Record<string, number | null>; result: AiEvaluation; total: number | null; createdAt: Date; model: string } | null;
  judgeRows: (JudgeScoreRow & { result: WeightedResult })[];
  completeCount: number;
  consensus: number | null;
  mandatory: MandatoryLine[];
  mandatoryStatus: MandatoryOverall;
};

// Loads every vendor with AI + committee scores.
// `onlyJudgeId` is the steering-committee view: it limits committee rows to that one
// evaluator AND never loads AI evaluations (scores, rationale, mandatory reads, pricing),
// so AI output can't reach a committee member's page or export. Committee members only
// see AI results through the full load, which pages allow once results are published.
export async function loadVendorSummaries(
  rfp: RfpSettings,
  opts: { onlyJudgeId?: string } = {}
): Promise<{ rubric: Criterion[]; vendors: VendorSummary[]; judgeCount: number }> {
  const rubric = rubricFor(rfp);
  const committeeView = !!opts.onlyJudgeId;
  const [respRows, aiRows, judgeRowsRaw, judges] = await Promise.all([
    db.select().from(responses).orderBy(responses.vendorName),
    committeeView ? Promise.resolve([]) : db.select().from(aiEvaluations),
    opts.onlyJudgeId
      ? db.select().from(judgeScores).where(eq(judgeScores.judgeUserId, opts.onlyJudgeId))
      : db.select().from(judgeScores),
    db.select({ id: users.id }).from(users).where(eq(users.role, "judge")),
  ]);
  const aiMap = new Map(aiRows.map((a) => [a.responseId, a]));
  const byResp = new Map<number, JudgeScoreRow[]>();
  for (const j of judgeRowsRaw) {
    if (!byResp.has(j.responseId)) byResp.set(j.responseId, []);
    byResp.get(j.responseId)!.push(j);
  }

  const vendors = respRows.map((r): VendorSummary => {
    const a = aiMap.get(r.id);
    const result = a ? (a.result as AiEvaluation) : null;
    const aiTotal = a ? weighted(a.scores, rubric).total : null;
    const jr = (byResp.get(r.id) ?? []).map((j) => ({ ...j, result: weighted(j.scores, rubric) }));
    const totals = jr.map((j) => j.result.total);
    const mandatory = mandatoryLines(rfp.mandatoryRequirements, r.mandatoryReview, result?.mandatory);
    return {
      response: r,
      ai: a && result ? { scores: a.scores, result, total: aiTotal, createdAt: a.createdAt, model: a.model } : null,
      judgeRows: jr,
      completeCount: jr.filter((j) => j.result.complete).length,
      consensus: consensus(aiTotal, totals, rfp.aiWeight),
      mandatory,
      mandatoryStatus: mandatoryOverall(mandatory),
    };
  });
  return { rubric, vendors, judgeCount: judges.length };
}

// Ranked list: vendors with a failed mandatory requirement are never shortlisted,
// whatever their score.
// A vendor is ranked only once at least one committee scorecard is complete: the AI is
// advisory and never ranks a vendor on its own.
export function rankVendors(vendors: VendorSummary[], shortlistSize: number) {
  const scored = vendors.filter((v) => v.consensus != null && v.completeCount > 0);
  const eligible = scored
    .filter((v) => v.mandatoryStatus !== "fail")
    .sort((a, b) => (b.consensus ?? 0) - (a.consensus ?? 0));
  const failed = scored
    .filter((v) => v.mandatoryStatus === "fail")
    .sort((a, b) => (b.consensus ?? 0) - (a.consensus ?? 0));
  const unscored = vendors.filter((v) => !(v.consensus != null && v.completeCount > 0));
  return {
    ranked: eligible.map((v, i) => ({ ...v, rank: i + 1, shortlisted: i < shortlistSize })),
    failed,
    unscored,
  };
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}
