import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { FileSpreadsheet, FileText, Pencil, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries } from "@/lib/summary";
import { db, users } from "@/lib/db/client";
import { aiConfigured } from "@/lib/ai/client";
import { kindOf, KIND_LABEL } from "@/lib/files/extract";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MandatoryBadge, ScoreBars, ScoreValue } from "@/components/score-display";
import { AiEvaluationDetail, PricingAnalysis } from "@/components/ai-evaluation";
import { ScorecardForm } from "./scorecard-form";
import { RunAiButton, AiPendingRefresher } from "./run-ai-button";
import { DeleteButton } from "./delete-button";
import { MandatoryReview } from "./mandatory-review";

export const dynamic = "force-dynamic";

export default async function VendorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const { id } = await params;
  const { uploaded } = await searchParams;
  const num = Number(id);
  if (!Number.isFinite(num)) notFound();

  const u = (await auth())!.user;
  const isCoordinator = u.role === "coordinator";
  const rfp = await getRfp();
  const { rubric, vendors } = await loadVendorSummaries(rfp, isCoordinator ? {} : { onlyJudgeId: u.id });
  const v = vendors.find((x) => x.response.id === num);
  if (!v) notFound();
  const r = v.response;
  const mine = v.judgeRows.find((j) => j.judgeUserId === u.id);

  const judgeIds = v.judgeRows.map((j) => j.judgeUserId);
  const judgeUsers = judgeIds.length
    ? await db.select().from(users).where(inArray(users.id, judgeIds))
    : [];
  const judgeMap = new Map(judgeUsers.map((x) => [x.id, x]));
  const uploader = r.uploadedByUserId
    ? (await db.select({ name: users.name }).from(users).where(eq(users.id, r.uploadedByUserId)).limit(1))[0]
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
      <div>
        <Link href="/evaluate" className="text-sm text-accent">
          ← All responses
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{r.vendorName}</h1>
            <p className="text-muted text-sm mt-1">
              {[r.contactName, r.contactEmail].filter(Boolean).join(" · ") || "Vendor response"}
              {isCoordinator && uploader ? ` · uploaded by ${uploader.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCoordinator && <MandatoryBadge status={v.mandatoryStatus} />}
            {isCoordinator && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/evaluate/upload?id=${r.id}`}>
                  <Pencil size={14} /> Edit
                </Link>
              </Button>
            )}
            {isCoordinator && <DeleteButton id={r.id} name={r.vendorName} />}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FileLink
          href={r.responseFileUrl}
          icon={<FileText size={18} />}
          title="RFP response"
          sub={`${r.responseFileName}${r.responsePageCount ? ` · ${r.responsePageCount} ${kindOf(r.responseFileName) === "pptx" ? "slides" : "pages"}` : ""}`}
        />
        <FileLink
          href={r.pricingFileUrl}
          icon={<FileSpreadsheet size={18} />}
          title="Pricing sheet"
          sub={`${r.pricingFileName} · ${KIND_LABEL[kindOf(r.pricingFileName)]}`}
        />
        {rfp.rfpFileUrl && (
          <FileLink
            href={rfp.rfpFileUrl}
            icon={<FileText size={18} />}
            title="Issued RFP"
            sub={rfp.rfpFileName ?? "RFP document"}
          />
        )}
      </div>

      {r.summary && (
        <Card>
          <CardBody>
            <p className="kicker mb-1">Coordinator notes</p>
            <p className="text-sm text-navy whitespace-pre-wrap">{r.summary}</p>
          </CardBody>
        </Card>
      )}

      {isCoordinator && (
        <>
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" /> AI evaluator
                {v.ai && (
                  <span className="ml-1">
                    ·{" "}
                    {v.ai.total == null ? (
                      <span className="text-sm font-normal text-amber-800">
                        no total: some criteria Not Evaluated for missing evidence
                      </span>
                    ) : (
                      <ScoreValue score={v.ai.total} />
                    )}
                  </span>
                )}
              </CardTitle>
              {aiConfigured() && !(uploaded && !v.ai) && <RunAiButton responseId={r.id} hasResult={!!v.ai} />}
            </CardHeader>
            <CardBody>
              {v.ai ? (
                <>
                  <ScoreBars rubric={rubric} scores={v.ai.scores} tone="accent" />
                  <div className="mt-6 pt-5 border-t border-line">
                    <AiEvaluationDetail evaluation={v.ai.result} scores={v.ai.scores} rubric={rubric} />
                  </div>
                  <p className="text-xs text-muted mt-5">
                    {v.ai.model} · {new Date(v.ai.createdAt).toLocaleString()} · advisory only, weighted{" "}
                    {Math.round(rfp.aiWeight * 100)}% in consensus. NE = not evaluated (missing evidence).
                  </p>
                </>
              ) : aiConfigured() ? (
                <>
                  <p className="text-sm text-muted">
                    {uploaded
                      ? "The AI evaluator is reading the RFP, response and pricing sheet. This usually takes one to three minutes; the page will refresh."
                      : "Not evaluated yet. Click “Run AI evaluator” to score this response."}
                  </p>
                  {uploaded && <AiPendingRefresher />}
                </>
              ) : (
                <p className="text-sm text-muted">
                  Add <code className="font-mono">ANTHROPIC_API_KEY</code> to enable the AI evaluator.
                </p>
              )}
            </CardBody>
          </Card>

          {rfp.mandatoryRequirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mandatory requirements</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-xs text-muted mb-4">
                  Pass/fail, separate from the weighted score. Confirm each requirement; your confirmation
                  overrides the AI&rsquo;s read. A failed requirement removes the vendor from the shortlist.
                </p>
                <MandatoryReview responseId={r.id} lines={v.mandatory} />
              </CardBody>
            </Card>
          )}

          {v.ai && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing analysis</CardTitle>
              </CardHeader>
              <CardBody>
                <PricingAnalysis pricing={v.ai.result.pricing} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Steering committee scorecards ({v.judgeRows.length})</CardTitle>
              <span className="text-sm text-muted">
                Consensus: <ScoreValue score={v.consensus} />
              </span>
            </CardHeader>
            <CardBody>
              {v.judgeRows.length === 0 ? (
                <p className="text-sm text-muted">No evaluator has started a scorecard yet.</p>
              ) : (
                <div className="space-y-4">
                  {v.judgeRows.map((j) => {
                    const ju = judgeMap.get(j.judgeUserId);
                    return (
                      <div key={j.judgeUserId} className="border border-line rounded-md p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                          <div>
                            <p className="font-medium text-navy">{ju?.name ?? "Evaluator"}</p>
                            <p className="text-xs text-muted">{ju?.title}</p>
                          </div>
                          <div className="text-right text-sm">
                            {j.result.complete ? (
                              <ScoreValue score={j.result.total} />
                            ) : (
                              <span className="text-amber-700 text-xs">
                                In progress · {j.result.scoredCount}/{rubric.length} scored
                              </span>
                            )}
                            <p className="text-xs text-muted">{new Date(j.updatedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <ScoreBars rubric={rubric} scores={j.scores} />
                        {Object.keys(j.criterionNotes).length > 0 && (
                          <ul className="mt-3 pt-3 border-t border-line space-y-1 text-sm">
                            {rubric
                              .filter((c) => j.criterionNotes[c.id])
                              .map((c) => (
                                <li key={c.id}>
                                  <span className="font-medium text-navy">{c.shortLabel}:</span>{" "}
                                  <span className="text-navy/85">{j.criterionNotes[c.id]}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                        {j.notes && (
                          <p className="mt-3 pt-3 border-t border-line text-sm text-navy whitespace-pre-wrap">{j.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {!isCoordinator && rfp.resultsPublished && (
        <Card className="border-accent/40 bg-accent-tint/40">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-navy">
              Results are published. See the consensus, other evaluators&rsquo; (anonymized) scorecards and the AI
              evaluator&rsquo;s read for {r.vendorName}.
            </p>
            <Button asChild size="sm" variant="accent">
              <Link href={`/rankings/${r.id}`}>View published results</Link>
            </Button>
          </CardBody>
        </Card>
      )}

      {!isCoordinator && (
        <Card>
          <CardHeader>
            <CardTitle>Your scorecard</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-muted mb-5">
              Score each criterion from 1 to 5 using the scale below, or mark it Not Evaluated if the
              evidence is missing. Record the basis for each score. Only you and the coordinators see
              your scorecard until results are published.
            </p>
            <ScorecardForm
              responseId={r.id}
              rubric={rubric}
              initial={{
                scores: mine?.scores ?? {},
                criterionNotes: mine?.criterionNotes ?? {},
                notes: mine?.notes ?? "",
              }}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function FileLink({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 hover:border-accent/60 transition-colors min-w-0"
    >
      <span className="w-9 h-9 rounded-md bg-accent-tint text-accent flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-navy">{title}</span>
        <span className="block text-xs text-muted truncate">{sub}</span>
      </span>
    </a>
  );
}
