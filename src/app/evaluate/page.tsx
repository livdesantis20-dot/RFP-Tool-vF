import Link from "next/link";
import { inArray } from "drizzle-orm";
import { ArrowRight, Download, Plus, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries } from "@/lib/summary";
import { db, users } from "@/lib/db/client";
import { aiConfigured } from "@/lib/ai/client";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MandatoryBadge, ScoreValue } from "@/components/score-display";
import { PublishToggle } from "./publish-toggle";

export const dynamic = "force-dynamic";

export default async function EvaluatePage() {
  const session = (await auth())!;
  const u = session.user;
  const isCoordinator = u.role === "coordinator";
  const rfp = await getRfp();
  const { rubric, vendors, judgeCount } = await loadVendorSummaries(
    rfp,
    isCoordinator ? {} : { onlyJudgeId: u.id }
  );

  const judgeIds = Array.from(new Set(vendors.flatMap((v) => v.judgeRows.map((j) => j.judgeUserId))));
  const judgeNames = new Map(
    judgeIds.length
      ? (await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, judgeIds))).map(
          (x) => [x.id, x.name]
        )
      : []
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="kicker">{rfp.clientName}</span>
          <h1 className="font-display text-3xl mt-1">{isCoordinator ? "Vendor responses" : "My evaluations"}</h1>
          <p className="text-muted text-sm mt-1">
            {vendors.length} response{vendors.length === 1 ? "" : "s"} · {rfp.procurementTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCoordinator && <PublishToggle published={rfp.resultsPublished} />}
          <Button asChild variant="outline" size="sm">
            <a href="/api/export">
              <Download size={14} /> Export CSV
            </a>
          </Button>
          {isCoordinator && (
            <Button asChild size="sm">
              <Link href="/evaluate/upload">
                <Plus size={14} /> Upload response
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isCoordinator && !aiConfigured() && (
        <p className="mt-5 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-4 py-3">
          The AI evaluator is off: add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
          <code className="font-mono">.env.local</code> and restart the server. Everything else works without it.
        </p>
      )}

      <Card className="mt-6">
        <CardBody className="p-0 sm:p-0 table-scroll">
          {isCoordinator ? (
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-mist text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Mandatory</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={13} /> AI evaluator
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">Committee scorecards</th>
                  <th className="px-4 py-3 font-medium">Consensus</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.response.id} className="border-t border-line hover:bg-mist/50 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{v.response.vendorName}</p>
                      <p className="text-xs text-muted">
                        {v.response.responsePageCount ? `${v.response.responsePageCount}-page response` : "Response"} ·
                        pricing sheet
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <MandatoryBadge status={v.mandatoryStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {v.ai && v.ai.total == null ? (
                        <span className="text-xs text-amber-800" title="The AI found no evidence for some criteria (Not Evaluated), so it gives no total.">
                          Incomplete · {rubric.filter((c) => v.ai!.scores[c.id] == null).length} not evaluated
                        </span>
                      ) : v.ai ? (
                        <ScoreValue score={v.ai.total} />
                      ) : (
                        <span className="text-xs text-muted">Not run yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted mb-1">
                        {v.completeCount} of {judgeCount} complete
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {v.judgeRows.map((j) => (
                          <span
                            key={j.judgeUserId}
                            className="inline-flex items-center gap-1 text-xs bg-mist border border-line rounded-full px-2 py-0.5"
                          >
                            <span className="text-navy">{(judgeNames.get(j.judgeUserId) ?? "?").split(" ")[0]}</span>
                            <span className="font-mono text-navy/70">
                              {j.result.total != null ? j.result.total.toFixed(2) : `${j.result.scoredCount}/${rubric.length}`}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {v.completeCount === 0 ? (
                        <span className="text-xs text-muted">Awaiting committee</span>
                      ) : (
                        <ScoreValue score={v.consensus} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/evaluate/${v.response.id}`}
                        className="inline-flex items-center gap-1 text-accent hover:text-navy font-medium"
                      >
                        Open <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && <EmptyRow cols={6} coordinator />}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-mist text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">My scorecard</th>
                  <th className="px-4 py-3 font-medium">My weighted total</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const mine = v.judgeRows[0];
                  return (
                    <tr key={v.response.id} className="border-t border-line hover:bg-mist/50">
                      <td className="px-4 py-3 font-medium text-navy">{v.response.vendorName}</td>
                      <td className="px-4 py-3">
                        {!mine ? (
                          <Badge variant="outline">Not started</Badge>
                        ) : mine.result.complete ? (
                          <Badge variant="success">Complete</Badge>
                        ) : (
                          <Badge variant="warning">
                            {mine.result.scoredCount}/{rubric.length} scored
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreValue score={mine?.result.total} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/evaluate/${v.response.id}`}
                          className="inline-flex items-center gap-1 text-accent hover:text-navy font-medium"
                        >
                          {mine ? "Continue" : "Evaluate"} <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {vendors.length === 0 && <EmptyRow cols={4} />}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-muted mt-3">
        {isCoordinator
          ? `Consensus = ${Math.round((1 - rfp.aiWeight) * 100)}% steering-committee mean (complete scorecards only) + ${Math.round(rfp.aiWeight * 100)}% AI evaluator. Scores are out of 5.00 and out of 100.`
          : "Only you and the coordinators can see your scores until results are published. The AI evaluator's scores are hidden from evaluators so they don't anchor your judgement."}
      </p>
    </div>
  );
}

function EmptyRow({ cols, coordinator }: { cols: number; coordinator?: boolean }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-muted">
        No vendor responses yet.
        {coordinator && (
          <>
            {" "}
            <Link href="/evaluate/upload" className="text-accent font-medium">
              Upload the first one
            </Link>{" "}
            or load the sample responses from{" "}
            <Link href="/rfp" className="text-accent font-medium">
              RFP setup
            </Link>
            .
          </>
        )}
      </td>
    </tr>
  );
}
