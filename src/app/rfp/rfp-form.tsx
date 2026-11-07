"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { saveRfpSettings } from "./actions";

type Initial = {
  clientName: string;
  procurementTitle: string;
  scopeSummary: string;
  issuedDate: string;
  responseDueDate: string;
  rfpFile: UploadedFile | null;
  mandatoryRequirements: string[];
  weights: Record<string, number>;
  aiWeightPct: number;
  shortlistSize: number;
};

export function RfpForm({
  initial,
  criteria,
  blobEnabled,
}: {
  initial: Initial;
  criteria: { id: string; label: string }[];
  blobEnabled: boolean;
}) {
  const [s, setS] = useState<Initial>(initial);
  const [newReq, setNewReq] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const total = Math.round(criteria.reduce((sum, c) => sum + (s.weights[c.id] ?? 0), 0) * 10) / 10;
  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setS((prev) => ({ ...prev, [k]: v }));

  function addReq() {
    const r = newReq.trim();
    if (!r) return;
    if (!s.mandatoryRequirements.includes(r)) set("mandatoryRequirements", [...s.mandatoryRequirements, r]);
    setNewReq("");
  }

  function save() {
    start(async () => {
      const r = await saveRfpSettings(s);
      if (r.ok) {
        toast.success("RFP settings saved");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>The RFP</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Client (issuing organization)">
              <Input value={s.clientName} onChange={(e) => set("clientName", e.target.value)} />
            </Field>
            <Field label="Procurement title">
              <Input value={s.procurementTitle} onChange={(e) => set("procurementTitle", e.target.value)} />
            </Field>
            <Field label="RFP issued">
              <Input type="date" value={s.issuedDate} onChange={(e) => set("issuedDate", e.target.value)} />
            </Field>
            <Field label="Responses due">
              <Input type="date" value={s.responseDueDate} onChange={(e) => set("responseDueDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Scope summary" hint="what's being procured, scale, timeline, priorities">
            <Textarea rows={4} value={s.scopeSummary} onChange={(e) => set("scopeSummary", e.target.value)} />
          </Field>
          <Field label="Issued RFP document" hint="the RFP sent to vendors · gives the AI the full requirements">
            <FileUpload
              value={s.rfpFile}
              onChange={(f) => set("rfpFile", f)}
              accept={[".pdf", ".docx", ".pptx", ".txt"]}
              blobEnabled={blobEnabled}
              onBusyChange={setBusy}
            />
            {s.rfpFile && (
              <button type="button" className="text-xs text-muted underline mt-1.5" onClick={() => set("rfpFile", null)}>
                Remove document
              </button>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mandatory requirements</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-muted">
            Pass/fail conditions, assessed separately. A vendor that fails one can&rsquo;t be shortlisted,
            whatever its weighted score.
          </p>
          <ul className="space-y-2">
            {s.mandatoryRequirements.map((m, i) => (
              <li key={m} className="flex items-start gap-2 text-sm bg-mist border border-line rounded-md px-3 py-2">
                <span className="text-muted w-5 shrink-0">{i + 1}.</span>
                <span className="flex-1 text-navy">{m}</span>
                <button
                  type="button"
                  aria-label="Remove requirement"
                  className="text-muted hover:text-red-700"
                  onClick={() => set("mandatoryRequirements", s.mandatoryRequirements.filter((x) => x !== m))}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={newReq}
              onChange={(e) => setNewReq(e.target.value)}
              placeholder="e.g. Hosted in a SOC 2 Type II audited environment"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addReq();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addReq}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Criterion weights</CardTitle>
          <span className={`text-sm font-mono ${Math.abs(total - 100) < 0.01 ? "text-emerald-700" : "text-red-700"}`}>
            Total {total}%
          </span>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {criteria.map((c) => (
              <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-navy">{c.label}</span>
                <span className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="w-20 h-9 text-right"
                    value={s.weights[c.id] ?? 0}
                    onChange={(e) => set("weights", { ...s.weights, [c.id]: Number(e.target.value) })}
                  />
                  <span className="text-muted">%</span>
                </span>
              </label>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-line">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-navy">
                AI evaluator weight in consensus
                <span className="block text-xs text-muted">0% makes the AI purely advisory</span>
              </span>
              <span className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  className="w-20 h-9 text-right"
                  value={s.aiWeightPct}
                  onChange={(e) => set("aiWeightPct", Number(e.target.value))}
                />
                <span className="text-muted">%</span>
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-navy">
                Shortlist size
                <span className="block text-xs text-muted">vendors advanced to the next round</span>
              </span>
              <Input
                type="number"
                min={1}
                max={10}
                className="w-20 h-9 text-right"
                value={s.shortlistSize}
                onChange={(e) => set("shortlistSize", Number(e.target.value))}
              />
            </label>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={pending || busy}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          Save RFP settings
        </Button>
      </div>
    </div>
  );
}
