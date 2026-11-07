import type { Criterion } from "@/lib/criteria";
import type { MandatoryStatus, ScoreMap } from "@/lib/db/schema";

export type WeightedResult = {
  // Σ(score × weight), only when every criterion is scored. Max 5.00.
  total: number | null;
  // Same sum over the criteria that are scored (for progress display only — never
  // used for ranking, per "do not assign an average score to missing evidence").
  partial: number;
  scoredCount: number;
  notEvaluated: string[]; // criterion ids
  complete: boolean;
};

export function weighted(scores: ScoreMap | null | undefined, rubric: Criterion[]): WeightedResult {
  const s = scores ?? {};
  let partial = 0;
  let scoredCount = 0;
  const notEvaluated: string[] = [];
  for (const c of rubric) {
    const v = s[c.id];
    if (typeof v === "number" && v > 0) {
      partial += v * c.weight;
      scoredCount++;
    } else {
      notEvaluated.push(c.id);
    }
  }
  const complete = notEvaluated.length === 0;
  return {
    total: complete ? round2(partial) : null,
    partial: round2(partial),
    scoredCount,
    notEvaluated,
    complete,
  };
}

export function to100(score: number | null | undefined): number | null {
  return score == null ? null : Math.round(score * 20);
}

export function round2(n: number): number {
  return Number(n.toFixed(2));
}

// Consensus = (1 − aiWeight) × mean of complete steering-committee scorecards
//           + aiWeight × AI evaluator total.
// Degrades gracefully: only humans → 100% humans; only AI → 100% AI; neither → null.
export function consensus(
  aiTotal: number | null,
  judgeTotals: (number | null)[],
  aiWeight: number
): number | null {
  const humans = judgeTotals.filter((n): n is number => n != null && n > 0);
  const humanMean = humans.length ? humans.reduce((a, b) => a + b, 0) / humans.length : null;
  const ai = aiTotal != null && aiTotal > 0 ? aiTotal : null;
  if (ai == null && humanMean == null) return null;
  if (ai == null) return round2(humanMean!);
  if (humanMean == null) return round2(ai);
  const w = Math.min(1, Math.max(0, aiWeight));
  return round2(w * ai + (1 - w) * humanMean);
}

export type MandatoryLine = {
  requirement: string;
  status: MandatoryStatus | "not-assessed";
  source: "coordinator" | "ai" | "none";
  evidence?: string;
};

export type MandatoryOverall = "pass" | "fail" | "open" | "n/a";

// Coordinator confirmation wins over the AI's read for each requirement.
export function mandatoryLines(
  requirements: string[],
  review: Record<string, MandatoryStatus> | null | undefined,
  ai: { requirement: string; status: MandatoryStatus; evidence: string }[] | null | undefined
): MandatoryLine[] {
  return requirements.map((req) => {
    const confirmed = review?.[req];
    const aiLine = ai?.find((a) => a.requirement.trim() === req.trim());
    if (confirmed) {
      return { requirement: req, status: confirmed, source: "coordinator", evidence: aiLine?.evidence };
    }
    if (aiLine) {
      return { requirement: req, status: aiLine.status, source: "ai", evidence: aiLine.evidence };
    }
    return { requirement: req, status: "not-assessed", source: "none" };
  });
}

export function mandatoryOverall(lines: MandatoryLine[]): MandatoryOverall {
  if (lines.length === 0) return "n/a";
  if (lines.some((l) => l.status === "fail")) return "fail";
  if (lines.every((l) => l.status === "pass")) return "pass";
  return "open";
}
