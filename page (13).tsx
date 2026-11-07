import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, responses } from "@/lib/db/client";
import { blobEnabled } from "@/lib/files/storage";
import { aiConfigured } from "@/lib/ai/client";
import { ResponseForm } from "./response-form";
import { DEMO_MODE } from "@/lib/demo";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth();
  if (session?.user.role !== "coordinator") redirect("/evaluate");
  const { id } = await searchParams;
  let existing = null;
  if (id) {
    const [row] = await db.select().from(responses).where(eq(responses.id, Number(id))).limit(1);
    if (!row) notFound();
    existing = row;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href={existing ? `/evaluate/${existing.id}` : "/evaluate"} className="text-sm text-accent">
        ← Back
      </Link>
      <h1 className="font-display text-3xl mt-2">{existing ? `Update ${existing.vendorName}` : "Upload a vendor response"}</h1>
      <p className="text-muted mt-2">
        Every participating firm submits two files: its RFP response (deck or PowerPoint) and the
        required pricing sheet. Upload both here; the AI evaluator reads them against the RFP and criteria.
      </p>
      {DEMO_MODE && !existing && (
        <div className="mt-6 rounded-lg border border-accent/40 bg-accent-tint/50 p-4 text-sm text-navy">
          <p className="font-semibold">Trying the demo? Use a late bidder&rsquo;s files</p>
          <p className="mt-1 text-muted">
            Download both files from Lakeshore Business Systems (fictional), then drop them into the boxes below.
            Name the vendor &ldquo;Lakeshore Business Systems&rdquo; and save.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* File downloads from a route handler — plain links on purpose. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/demo/sample-file/response"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 font-medium hover:border-accent"
            >
              <Download size={14} /> Response deck (PDF)
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/demo/sample-file/pricing"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 font-medium hover:border-accent"
            >
              <Download size={14} /> Pricing sheet (Excel)
            </a>
          </div>
        </div>
      )}
      <div className="mt-8">
        <ResponseForm
          blobEnabled={blobEnabled()}
          aiEnabled={aiConfigured()}
          initial={
            existing
              ? {
                  id: existing.id,
                  vendorName: existing.vendorName,
                  contactName: existing.contactName ?? "",
                  contactEmail: existing.contactEmail ?? "",
                  summary: existing.summary,
                  responseFile: { url: existing.responseFileUrl, name: existing.responseFileName },
                  pricingFile: { url: existing.pricingFileUrl, name: existing.pricingFileName },
                }
              : null
          }
        />
      </div>
    </div>
  );
}
