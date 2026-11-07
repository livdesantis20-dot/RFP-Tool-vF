"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RunAiButton({ responseId, hasResult }: { responseId: number; hasResult: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(force: boolean) {
    start(async () => {
      const t = toast.loading("AI evaluator is reading the documents… (1–3 min)");
      try {
        const r = await fetch(`/api/evaluate/${responseId}${force ? "?force=1" : ""}`, { method: "POST" });
        const data = await r.json().catch(() => ({}));
        toast.dismiss(t);
        if (r.ok && data.ok) {
          toast.success(data.cached ? "Already up to date" : "AI evaluation complete");
          router.refresh();
        } else toast.error(data.error ?? `Failed (${r.status})`);
      } catch (e) {
        toast.dismiss(t);
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex gap-2">
      {!hasResult ? (
        <Button size="sm" variant="accent" onClick={() => run(false)} disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Run AI evaluator
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => run(true)} disabled={pending} title="Re-read the documents and re-score">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Re-run
        </Button>
      )}
    </div>
  );
}

// After an upload the evaluation runs in the background; refresh until it lands.
export function AiPendingRefresher() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    const stop = setTimeout(() => clearInterval(t), 6 * 60_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [router]);
  return null;
}
