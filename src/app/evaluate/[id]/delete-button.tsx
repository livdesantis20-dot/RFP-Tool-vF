"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteVendorResponse } from "../actions";

export function DeleteButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          setTimeout(() => setConfirming(false), 4000);
          return;
        }
        start(async () => {
          const r = await deleteVendorResponse(id);
          if (r && !r.ok) toast.error(r.error);
        });
      }}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      {confirming ? `Click again to delete ${name}` : "Delete"}
    </Button>
  );
}
