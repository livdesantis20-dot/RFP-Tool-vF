import type { Criterion } from "@/lib/criteria";
import type { ScoreMap } from "@/lib/db/schema";
import { weighted } from "@/lib/scoring";

export type JudgeRow = {
  responseId: number;
  judgeUserId: string;
  scores: ScoreMap;
  notes: string;
};

export type AgentRow = { responseId: number; scores: ScoreMap; total: number | null };

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function std(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

export type VendorInsight = {
  responseId: number;
  vendorName: string;
  agentTotal: number | null;
  judgeTotals: number[];
  judgeCount: number;
  judgeMean: number | null;
  judgeStd: number | null;
  agentHumanDelta: number | null;
};

export function buildVendorInsights(
  vendors: { id: number; vendorName: string }[],
  judgesByResponse: Map<number, JudgeRow[]>,
  agents: Map<number, AgentRow>,
  rubric: Criterion[]
): VendorInsight[] {
  return vendors.map((v) => {
    const totals = (judgesByResponse.get(v.id) ?? [])
      .map((j) => weighted(j.scores, rubric).total)
      .filter((t): t is number => t != null);
    const jm = mean(totals);
    const agentTotal = agents.get(v.id)?.total ?? null;
    return {
      responseId: v.id,
      vendorName: v.vendorName,
      agentTotal,
      judgeTotals: totals,
      judgeCount: totals.length,
      judgeMean: jm,
      judgeStd: std(totals),
      agentHumanDelta: agentTotal != null && jm != null ? agentTotal - jm : null,
    };
  });
}

export type JudgeProfile = { judgeUserId: string; count: number; meanScore: number | null };

export function buildJudgeProfiles(rows: JudgeRow[], rubric: Criterion[]): JudgeProfile[] {
  const by = new Map<string, number[]>();
  for (const j of rows) {
    const t = weighted(j.scores, rubric).total;
    if (t == null) continue;
    if (!by.has(j.judgeUserId)) by.set(j.judgeUserId, []);
    by.get(j.judgeUserId)!.push(t);
  }
  return Array.from(by.entries()).map(([id, xs]) => ({
    judgeUserId: id,
    count: xs.length,
    meanScore: mean(xs),
  }));
}

export type CriterionDist = {
  criterionId: string;
  label: string;
  weight: number;
  humanMean: number | null;
  aiMean: number | null;
  histogram: { score: number; humanPct: number; aiPct: number }[];
};

// Counts normalized to percentages so the AI series (one per vendor) is comparable
// to the human series (one per evaluator per vendor).
export function buildCriterionDistributions(
  judgeRows: JudgeRow[],
  agents: AgentRow[],
  rubric: Criterion[]
): CriterionDist[] {
  return rubric.map((c) => {
    const humans = judgeRows
      .map((j) => j.scores[c.id])
      .filter((n): n is number => typeof n === "number" && n > 0);
    const ai = agents
      .map((a) => a.scores[c.id])
      .filter((n): n is number => typeof n === "number" && n > 0);
    const ht = humans.length || 1;
    const at = ai.length || 1;
    return {
      criterionId: c.id,
      label: c.label,
      weight: c.weight,
      humanMean: mean(humans),
      aiMean: mean(ai),
      histogram: [1, 2, 3, 4, 5].map((score) => ({
        score,
        humanPct: (humans.filter((h) => Math.round(h) === score).length / ht) * 100,
        aiPct: (ai.filter((a) => Math.round(a) === score).length / at) * 100,
      })),
    };
  });
}

// Mean committee score per vendor per criterion — the comparison heatmap.
export function vendorCriterionMatrix(
  vendors: { id: number; vendorName: string }[],
  judgesByResponse: Map<number, JudgeRow[]>,
  rubric: Criterion[]
): { vendorName: string; responseId: number; cells: (number | null)[] }[] {
  return vendors.map((v) => {
    const rows = judgesByResponse.get(v.id) ?? [];
    return {
      vendorName: v.vendorName,
      responseId: v.id,
      cells: rubric.map((c) =>
        mean(
          rows
            .map((j) => j.scores[c.id])
            .filter((n): n is number => typeof n === "number" && n > 0)
        )
      ),
    };
  });
}
