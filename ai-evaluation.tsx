import type { AiEvaluation } from "@/lib/ai/evaluate";
import type { Criterion } from "@/lib/criteria";
import { scaleLabel } from "@/lib/criteria";
import { formatUsd } from "@/lib/summary";

export function AiEvaluationDetail({
  evaluation,
  scores,
  rubric,
}: {
  evaluation: AiEvaluation;
  scores: Record<string, number | null>;
  rubric: Criterion[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="kicker mb-1">Overview</p>
        <p className="text-sm text-navy">{evaluation.overview}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <ListBlock title="Strengths" items={evaluation.strengths} tone="good" />
        <ListBlock title="Risks" items={evaluation.risks} tone="bad" />
      </div>

      <div>
        <p className="kicker mb-2">Criterion-by-criterion</p>
        <ul className="divide-y divide-line border border-line rounded-md">
          {rubric.map((c) => {
            const r = evaluation.criteria[c.id];
            const s = scores[c.id];
            return (
              <li key={c.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-navy text-sm">
                    {c.label} <span className="text-muted font-normal">· {Math.round(c.weight * 100)}%</span>
                  </p>
                  <p className="text-xs text-muted">
                    <span className="font-mono font-semibold text-navy text-sm">{s ?? "NE"}</span>{" "}
                    {scaleLabel(s)}
                  </p>
                </div>
                {r && <p className="text-sm text-navy/85 mt-1">{r.rationale}</p>}
                {r?.gaps && <p className="text-xs text-amber-800 mt-1.5">Gaps: {r.gaps}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {evaluation.clarificationQuestions.length > 0 && (
        <div>
          <p className="kicker mb-2">Suggested clarification questions</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-navy">
            {evaluation.clarificationQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function PricingAnalysis({ pricing }: { pricing: AiEvaluation["pricing"] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Estimated total cost</p>
          <p className="font-display text-3xl text-navy">{formatUsd(pricing.estimatedTotalUsd)}</p>
        </div>
        {pricing.termYears != null && (
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Term</p>
            <p className="text-lg text-navy">{pricing.termYears} years</p>
          </div>
        )}
      </div>
      <p className="text-sm text-navy">{pricing.totalCostSummary}</p>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-navy">One-time</p>
          <p className="text-navy/85">{pricing.oneTimeCosts}</p>
        </div>
        <div>
          <p className="font-medium text-navy">Recurring</p>
          <p className="text-navy/85">{pricing.recurringCosts}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <ListBlock title="Assumptions & exclusions" items={pricing.assumptions} tone="neutral" />
        <ListBlock title="Commercial concerns" items={pricing.concerns} tone="bad" />
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad" | "neutral";
}) {
  if (!items.length) return null;
  const dot = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-amber-700" : "text-muted";
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{title}</p>
      <ul className="space-y-1 text-sm text-navy">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${dot} shrink-0`}>•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
