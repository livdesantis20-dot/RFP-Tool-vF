import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries, rankVendors } from "@/lib/summary";
import { buildJudgeAnonMap } from "@/lib/insights/anonymize";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { LineStatus, MandatoryBadge, ScoreBars, ScoreValue } from "@/components/score-display";
import { AiEvaluationDetail, PricingAnalysis } from "@/components/ai-evaluation";

export const dynamic = "force-dynamic";

// Published per-vendor results for the steering committee. Evaluators are anonymized.
export default async function VendorResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/signin");
  const rfp = await getRfp();
  if (!rfp.resultsPublished && session.user.role !== "coordinator") redirect("/rankings");

  const { id } = await params;
  const num = Number(id);
  const { rubric, vendors } = await loadVendorSummaries(rfp);
  const v = vendors.find((x) => x.response.id === num);
  if (!v) notFound();
  const { ranked } = rankVendors(vendors, rfp.shortlistSize);
  const rank = ranked.find((r) => r.response.id === num)?.rank ?? null;
  const anon = buildJudgeAnonMap(vendors.flatMap((x) => x.judgeRows.map((j) => j.judgeUserId)));
  const rows = [...v.judgeRows].sort((a, b) =>
    (anon.get(a.judgeUserId) ?? "").localeCompare(anon.get(b.judgeUserId) ?? "", undefined, { numeric: true })
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6">
      <Link href="/rankings" className="inline-flex items-center gap-1 text-sm text-accent">
        <ArrowLeft size={14} /> Rankings
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{v.response.vendorName}</h1>
          <p className="text-muted text-sm mt-1">{rank ? `Ranked #${rank}` : v.mandatoryStatus === "fail" ? "Not eligible — failed mandatory requirement" : "Unranked"}</p>
        </div>
        <MandatoryBadge status={v.mandatoryStatus} />
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Consensus score</p>
            <ScoreValue score={v.consensus} size="lg" />
          </div>
          <div className="text-xs text-muted text-right">
            <p>
              {v.completeCount} complete scorecard{v.completeCount === 1 ? "" : "s"}
              {v.ai ? " + AI evaluator" : ""}
            </p>
            <p className="mt-0.5">
              {Math.round((1 - rfp.aiWeight) * 100)}% committee · {Math.round(rfp.aiWeight * 100)}% AI
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <a href={v.response.responseFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-navy underline">
          <FileText size={14} /> RFP response
        </a>
        <a href={v.response.pricingFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-navy underline">
          <FileSpreadsheet size={14} /> Pricing sheet
        </a>
      </div>

      {v.mandatory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mandatory requirements</CardTitle>
          </CardHeader>
          <CardBody className="p-0 sm:p-0">
            <ul className="divide-y divide-line">
              {v.mandatory.map((m) => (
                <li key={m.requirement} className="px-5 py-3 flex items-start justify-between gap-4">
                  <span className="text-sm text-navy">{m.requirement}</span>
                  <LineStatus status={m.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Steering committee ({rows.length})</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {rows.length === 0 && <p className="text-sm text-muted">No scorecards.</p>}
          {rows.map((j) => (
            <div key={j.judgeUserId} className="border border-line rounded-md p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-medium text-navy">{anon.get(j.judgeUserId)}</p>
                {j.result.complete ? <ScoreValue score={j.result.total} /> : <span className="text-xs text-amber-700">Incomplete</span>}
              </div>
              <ScoreBars rubric={rubric} scores={j.scores} />
              {j.notes && <p className="mt-3 pt-3 border-t border-line text-sm text-navy whitespace-pre-wrap">{j.notes}</p>}
            </div>
          ))}
        </CardBody>
      </Card>

      {v.ai && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" /> AI evaluator · <ScoreValue score={v.ai.total} />
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ScoreBars rubric={rubric} scores={v.ai.scores} tone="accent" />
              <div className="mt-6 pt-5 border-t border-line">
                <AiEvaluationDetail evaluation={v.ai.result} scores={v.ai.scores} rubric={rubric} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pricing analysis</CardTitle>
            </CardHeader>
            <CardBody>
              <PricingAnalysis pricing={v.ai.result.pricing} />
            </CardBody>
          </Card>
        </>
      )}

      <p className="text-xs text-muted italic">Evaluator identities are anonymized. Scores and notes are shown in full.</p>
    </div>
  );
}
