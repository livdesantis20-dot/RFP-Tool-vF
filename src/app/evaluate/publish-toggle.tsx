"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setResultsPublished } from "./actions";

export function PublishToggle({ published }: { published: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={published ? "accent" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!published && !confirm("Publish results? The steering committee will see rankings, consensus scores, and all evaluators' (anonymized) scorecards.")) return;
        start(async () => {
          const r = await setResultsPublished(!published);
          if (r.ok) {
            toast.success(published ? "Results hidden" : "Results published to the committee");
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : published ? <Eye size={14} /> : <EyeOff size={14} />}
      Results: {published ? "Published" : "Hidden"}
    </Button>
  );
}
