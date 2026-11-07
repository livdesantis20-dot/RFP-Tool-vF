import type { Criterion } from "@/lib/criteria";
import { SCORE_MAX } from "@/lib/criteria";
import type { MandatoryOverall } from "@/lib/scoring";
import { to100 } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export function ScoreBars({
  rubric,
  scores,
  tone = "navy",
}: {
  rubric: Criterion[];
  scores: Record<string, number | null | undefined>;
  tone?: "navy" | "accent";
}) {
  return (
    <div className="grid md:grid-cols-2 gap-x-8 gap-y-2.5">
      {rubric.map((c) => {
        const v = scores[c.id];
        return (
          <div key={c.id} className="flex items-center gap-3 text-sm min-w-0">
            <span className="text-navy w-40 sm:w-52 shrink-0 truncate" title={c.label}>
              {c.label}
            </span>
            <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden">
              <div
                className={tone === "accent" ? "h-full bg-accent" : "h-full bg-navy/80"}
                style={{ width: `${((v ?? 0) / SCORE_MAX) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-navy w-8 text-right">
              {typeof v === "number" ? v.toFixed(0) : "NE"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreValue({
  score,
  size = "md",
}: {
  score: number | null | undefined;
  size?: "md" | "lg";
}) {
  if (score == null) return <span className="text-muted">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className={size === "lg" ? "font-display text-4xl text-navy" : "font-mono font-semibold text-navy"}>
        {score.toFixed(2)}
      </span>
      <span className={size === "lg" ? "text-muted text-lg ml-1" : "text-muted text-xs ml-1"}>
        / 5 · {to100(score)}
      </span>
    </span>
  );
}

export function MandatoryBadge({ status }: { status: MandatoryOverall }) {
  if (status === "pass")
    return (
      <Badge variant="success">
        <CheckCircle2 size={12} /> Mandatory: pass
      </Badge>
    );
  if (status === "fail")
    return (
      <Badge variant="danger">
        <XCircle size={12} /> Mandatory: fail
      </Badge>
    );
  if (status === "open")
    return (
      <Badge variant="warning">
        <HelpCircle size={12} /> Mandatory: open
      </Badge>
    );
  return <Badge variant="outline">No mandatory reqs</Badge>;
}

export function LineStatus({ status }: { status: string }) {
  if (status === "pass")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
        <CheckCircle2 size={14} /> Pass
      </span>
    );
  if (status === "fail")
    return (
      <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
        <XCircle size={14} /> Fail
      </span>
    );
  if (status === "unclear")
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
        <HelpCircle size={14} /> Unclear
      </span>
    );
  return <span className="text-xs text-muted">Not assessed</span>;
}
