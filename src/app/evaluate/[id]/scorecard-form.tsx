"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Criterion } from "@/lib/criteria";
import { SCORE_SCALE } from "@/lib/criteria";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveScorecard } from "../actions";

type State = {
  scores: Record<string, number | null>;
  criterionNotes: Record<string, string>;
  notes: string;
};

export function ScorecardForm({
  responseId,
  rubric,
  initial,
}: {
  responseId: number;
  rubric: Criterion[];
  initial: State;
}) {
  const [s, setS] = useState<State>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const scored = rubric.filter((c) => typeof s.scores[c.id] === "number");
  const partial = scored.reduce((sum, c) => sum + (s.scores[c.id] as number) * c.weight, 0);
  const complete = scored.length === rubric.length;

  function setScore(id: string, v: number | null) {
    setS({ ...s, scores: { ...s.scores, [id]: v } });
  }

  function save() {
    start(async () => {
      const r = await saveScorecard({ responseId, ...s });
      if (r.ok) {
        toast.success(complete ? "Scorecard saved" : "Draft saved — some criteria are still Not Evaluated");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <details className="text-xs text-muted bg-mist border border-line rounded-md p-3">
        <summary className="cursor-pointer font-medium text-navy">Scoring scale</summary>
        <ul className="mt-2 space-y-1">
          {SCORE_SCALE.map((k) => (
            <li key={k.score}>
              <span className="font-semibold text-navy">{k.score} · {k.rating}.</span> {k.definition}
            </li>
          ))}
        </ul>
      </details>

      <ul className="divide-y divide-line border border-line rounded-md">
        {rubric.map((c) => {
          const v = s.scores[c.id];
          return (
            <li key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-xl">
                  <p className="font-medium text-navy text-sm">
                    {c.label} <span className="text-muted font-normal">· {Math.round(c.weight * 100)}%</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">{c.question}</p>
                </div>
                <div className="flex items-center gap-1" role="radiogroup" aria-label={`${c.label} score`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={v === n}
                      title={SCORE_SCALE[n - 1].rating}
                      onClick={() => setScore(c.id, v === n ? null : n)}
                      className={`w-9 h-9 rounded-md border text-sm font-semibold transition-colors ${
                        v === n
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-navy border-line hover:border-navy/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={v == null}
                    onClick={() => setScore(c.id, null)}
                    className={`h-9 px-2.5 rounded-md border text-xs font-medium ${
                      v == null ? "bg-mist text-navy border-navy/30" : "bg-white text-muted border-line"
                    }`}
                  >
                    NE
                  </button>
                </div>
              </div>
              <Textarea
                className="mt-3 min-h-14 text-sm"
                rows={2}
                placeholder="Basis for score, evidence cited, gaps…"
                value={s.criterionNotes[c.id] ?? ""}
                onChange={(e) => setS({ ...s, criterionNotes: { ...s.criterionNotes, [c.id]: e.target.value } })}
              />
            </li>
          );
        })}
      </ul>

      <label className="block text-sm">
        <span className="block text-navy font-medium mb-1.5">Overall notes, mandatory exceptions and follow-up items</span>
        <Textarea value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} rows={4} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-mist border border-line rounded-md px-4 py-3">
        <div className="text-sm">
          <span className="text-muted">Weighted total: </span>
          {complete ? (
            <span className="font-mono font-semibold text-navy">
              {partial.toFixed(2)} / 5 · {Math.round(partial * 20)} / 100
            </span>
          ) : (
            <span className="text-amber-700">
              {rubric.length - scored.length} criteria not evaluated — total shown once all are scored
            </span>
          )}
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          Save scorecard
        </Button>
      </div>
    </div>
  );
}
