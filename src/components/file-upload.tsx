"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";

export type UploadedFile = { url: string; name: string };

const MAX_MB = 50;

export function FileUpload({
  value,
  onChange,
  accept,
  blobEnabled,
  placeholder = "Drag a file here or click to browse",
  onBusyChange,
}: {
  value: UploadedFile | null;
  onChange: (f: UploadedFile) => void;
  accept: string[];
  blobEnabled: boolean;
  placeholder?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function setB(b: boolean) {
    setBusy(b);
    onBusyChange?.(b);
  }

  async function handle(file: File) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!accept.includes(ext)) {
      toast.error(`Unsupported file type. Use ${accept.join(", ")}`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB} MB`);
      return;
    }
    setB(true);
    try {
      if (blobEnabled) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        onChange({ url: blob.url, name: file.name });
      } else {
        const fd = new FormData();
        fd.set("file", file);
        const r = await fetch("/api/files", { method: "POST", body: fd });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.url) throw new Error(data.error ?? `Upload failed (${r.status})`);
        onChange({ url: data.url, name: file.name });
      }
      toast.success(`Uploaded ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setB(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="border-2 border-dashed border-line rounded-lg p-5 text-center hover:border-accent/60 cursor-pointer bg-mist/50 transition-colors"
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") ref.current?.click();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) handle(f);
      }}
    >
      <input
        ref={ref}
        type="file"
        accept={accept.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {busy ? (
        <p className="flex items-center justify-center gap-2 text-muted text-sm">
          <Loader2 className="animate-spin" size={16} /> Uploading…
        </p>
      ) : value ? (
        <p className="flex items-center justify-center gap-2 text-navy text-sm">
          <FileText size={16} className="text-accent" />
          <span className="font-medium truncate max-w-[16rem]">{value.name}</span>
          <span className="text-muted">· click to replace</span>
        </p>
      ) : (
        <p className="flex items-center justify-center gap-2 text-muted text-sm">
          <Upload size={16} /> {placeholder}
        </p>
      )}
      <p className="text-xs text-muted mt-1.5">{accept.join(" · ").toUpperCase()} · max {MAX_MB} MB</p>
    </div>
  );
}
