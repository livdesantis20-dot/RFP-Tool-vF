"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { MandatoryLine } from "@/lib/scoring";
import type { MandatoryStatus } from "@/lib/db/schema";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineStatus } from "@/components/score-display";
import { saveMandatoryReview } from "../actions";

export function MandatoryReview({ responseId, lines }: { responseId: number; lines: MandatoryLine[] }) {
  const [review, setReview] = useState<Record<string, MandatoryStatus | "">>(
    Object.fromEntries(lines.map((l) => [l.requirement, l.source === "coordinator" ? (l.status as MandatoryStatus) : ""]))
  );
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line border border-line rounded-md">
        {lines.map((l) => (
          <li key={l.requirement} className="p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-navy font-medium">{l.requirement}</p>
              <p className="text-xs text-muted mt-1">
                {l.evidence ? `AI: ${l.evidence}` : "No AI assessment yet."}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <LineStatus status={l.status} />
              <Select
                className="w-40 h-9"
                value={review[l.requirement] ?? ""}
                onChange={(e) => setReview({ ...review, [l.requirement]: e.target.value as MandatoryStatus | "" })}
                aria-label="Coordinator confirmation"
              >
                <option value="">Use AI read</option>
                <option value="pass">Confirm pass</option>
                <option value="fail">Confirm fail</option>
                <option value="unclear">Needs clarification</option>
              </Select>
            </div>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveMandatoryReview(responseId, review);
            if (r.ok) {
              toast.success("Mandatory review saved");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        Save confirmations
      </Button>
    </div>
  );
}
