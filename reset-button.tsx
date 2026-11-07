"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResetButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Reset the demo to its starting point? Any scores, uploads and published results will be cleared.")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : null}
      {pending ? "Resetting…" : children}
    </Button>
  );
}
