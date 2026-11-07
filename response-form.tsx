"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { saveVendorResponse } from "../actions";

const RESPONSE_EXTS = [".pptx", ".pdf"];
const PRICING_EXTS = [".xlsx", ".csv", ".pdf", ".pptx"];

type Initial = {
  id: number;
  vendorName: string;
  contactName: string;
  contactEmail: string;
  summary: string;
  responseFile: UploadedFile;
  pricingFile: UploadedFile;
} | null;

export function ResponseForm({
  initial,
  blobEnabled,
  aiEnabled,
}: {
  initial: Initial;
  blobEnabled: boolean;
  aiEnabled: boolean;
}) {
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [responseFile, setResponseFile] = useState<UploadedFile | null>(initial?.responseFile ?? null);
  const [pricingFile, setPricingFile] = useState<UploadedFile | null>(initial?.pricingFile ?? null);
  const [runAi, setRunAi] = useState(true);
  const [busy, setBusy] = useState(0);
  const [pending, start] = useTransition();

  const checklist = [
    { done: vendorName.trim().length >= 2, label: "Vendor name" },
    { done: !!responseFile, label: "RFP response deck" },
    { done: !!pricingFile, label: "Pricing sheet" },
  ];
  const canSubmit = checklist.every((c) => c.done) && busy === 0 && !pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !responseFile || !pricingFile) return;
    start(async () => {
      const r = await saveVendorResponse({
        id: initial?.id,
        vendorName,
        contactName,
        contactEmail,
        summary,
        responseFile,
        pricingFile,
        runAi,
      });
      if (r && !r.ok) toast.error(r.error);
    });
  }

  const onBusy = (b: boolean) => setBusy((n) => n + (b ? 1 : -1));

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Vendor / firm name" className="sm:col-span-2">
          <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Northline Cloud ERP" />
        </Field>
        <Field label="Primary contact" hint="optional">
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <Field label="Contact email" hint="optional">
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </Field>
      </div>

      <Field label="RFP response" hint="PowerPoint or PDF deck">
        <FileUpload
          value={responseFile}
          onChange={setResponseFile}
          accept={RESPONSE_EXTS}
          blobEnabled={blobEnabled}
          onBusyChange={onBusy}
        />
      </Field>

      <Field label="Pricing sheet" hint="required from every firm · Excel, CSV, PDF or PowerPoint">
        <FileUpload
          value={pricingFile}
          onChange={setPricingFile}
          accept={PRICING_EXTS}
          blobEnabled={blobEnabled}
          onBusyChange={onBusy}
        />
      </Field>

      <Field label="Coordinator notes" hint="optional · context for evaluators and the AI, e.g. late submission, clarifications received">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
      </Field>

      <Card>
        <CardBody className="py-4 sm:py-4 flex flex-wrap items-center justify-between gap-4">
          <ul className="flex flex-wrap gap-4 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className={`flex items-center gap-1.5 ${c.done ? "text-emerald-700" : "text-muted"}`}>
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${c.done ? "border-emerald-600 bg-emerald-50" : "border-line"}`}
                >
                  {c.done && <Check size={10} />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          {aiEnabled && (
            <label className="flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={runAi} onChange={(e) => setRunAi(e.target.checked)} />
              Run the AI evaluator after saving
            </label>
          )}
        </CardBody>
      </Card>

      <Button type="submit" size="lg" disabled={!canSubmit}>
        {pending && <Loader2 className="animate-spin" size={16} />}
        {initial ? "Save changes" : "Save response"}
      </Button>
    </form>
  );
}
