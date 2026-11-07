"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSampleRfp, resetDemo } from "./actions";

export function DemoTools() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <strong className="text-navy">Reset to demo starting point</strong> restores the fictional ERP RFP, three
        vendor responses with their AI evaluations, and three committee scorecards (Raj Patel is left for the
        person taking the demo). It&rsquo;s instant and doesn&rsquo;t call the AI.{" "}
        <strong className="text-navy">Clear all data</strong> empties everything so you can set up a real RFP.
        People are kept either way.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="accent"
          disabled={pending}
          onClick={() => {
            if (!confirm("Restore the demo starting point? Current responses, scores and uploads will be replaced.")) return;
            start(async () => {
              const r = await loadSampleRfp();
              if (r.ok) {
                toast.success(r.message ?? "Restored");
                router.push("/evaluate");
              } else toast.error(r.error);
            });
          }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Reset to demo starting point
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete all vendor responses, scorecards, AI evaluations and uploaded files, and restore the default RFP settings? People are kept.")) return;
            start(async () => {
              const r = await resetDemo();
              if (r.ok) {
                toast.success(r.message ?? "Cleared");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <Trash2 size={14} /> Clear all data
        </Button>
      </div>
    </div>
  );
}
