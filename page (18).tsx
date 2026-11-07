import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries, rankVendors, formatUsd } from "@/lib/summary";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MandatoryBadge, ScoreValue } from "@/components/score-display";
import { to100 } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const isCoordinator = session.user.role === "coordinator";
  const rfp = await getRfp();

  if (!rfp.resultsPublished && !isCoordinator) {
    const { vendors } = await loadVendorSummaries(rfp, { onlyJudgeId: session.user.id });
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <span className="kicker">Downselection</span>
        <h1 className="font-display text-3xl mt-1">Rankings</h1>
        <p className="text-muted mt-2">
          Rankings and consensus scores are hidden until the coordinators publish results, so every
          evaluator scores independently.
        </p>
        <Card className="mt-8">
          <CardBody className="p-0 sm:p-0">
            <ul className="divide-y divide-line">
              {vendors.map((v) => (
                <li key={v.response.id} className="px-4 py-3 flex items-center justify-between">
                  <span className="font-medium text-navy">{v.response.vendorName}</span>
                  <span className="text-muted tracking-widest">•••</span>
                </li>
              ))}
              {vendors.length === 0 && <li className="px-4 py-8 text-center text-muted">No responses yet.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { rubric, vendors, judgeCount } = await loadVendorSummaries(rfp);
  const { ranked, failed, unscored } = rankVendors(vendors, rfp.shortlistSize);
  const shortlist = ranked.filter((r) => r.shortlisted);
  const detailHref = (id: number) => (isCoordinator ? `/evaluate/${id}` : `/rankings/${id}`);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <span className="kicker">Downselection</span>
        <h1 className="font-display text-3xl mt-1">Rankings</h1>
        <p className="text-muted text-sm mt-1">
          {rfp.procurementTitle} · consensus of {judgeCount} committee member{judgeCount === 1 ? "" : "s"}
          {rfp.aiWeight > 0 ? ` and the AI evaluator (${Math.round(rfp.aiWeight * 100)}%)` : ""}
          {isCoordinator && !rfp.resultsPublished && (
            <span className="ml-2 text-accent font-medium">· Coordinator preview — not yet published</span>
          )}
        </p>
      </div>

      {shortlist.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <Award size={18} className="text-accent" /> Recommended shortlist
          </h2>
          <div className="mt-3 grid md:grid-cols-3 gap-4">
            {shortlist.map((v) => (
              <Link
                key={v.response.id}
                href={detailHref(v.response.id)}
                className={`block rounded-lg border p-5 transition-shadow hover:shadow-md ${
                  v.rank === 1 ? "bg-navy text-white border-navy" : "bg-white border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`font-display text-4xl ${v.rank === 1 ? "text-accent-bright" : "text-accent"}`}>
                    #{v.rank}
                  </span>
                  <span className="text-right">
                    <span className={`block font-mono text-2xl ${v.rank === 1 ? "text-white" : "text-navy"}`}>
                      {v.consensus!.toFixed(2)}
                    </span>
                    <span className={`text-xs ${v.rank === 1 ? "text-white/70" : "text-muted"}`}>
                      / 5.00 · {to100(v.consensus)} / 100
                    </span>
                  </span>
                </div>
                <p className={`font-semibold mt-3 ${v.rank === 1 ? "text-white" : "text-navy"}`}>
                  {v.response.vendorName}
                </p>
                <p className={`text-xs mt-1 ${v.rank === 1 ? "text-white/70" : "text-muted"}`}>
                  {v.completeCount} scorecard{v.completeCount === 1 ? "" : "s"}
                  {v.ai?.result.pricing.estimatedTotalUsd
                    ? ` · ~${formatUsd(v.ai.result.pricing.estimatedTotalUsd)}${v.ai.result.pricing.termYears ? ` / ${v.ai.result.pricing.termYears} yrs` : ""}`
                    : ""}
                </p>
                <p className={`text-xs mt-3 inline-flex items-center gap-1 ${v.rank === 1 ? "text-accent-bright" : "text-accent"}`}>
                  View detail <ArrowRight size={12} />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Full ranking</CardTitle>
        </CardHeader>
        <CardBody className="p-0 sm:p-0 table-scroll">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-mist text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium w-14">Rank</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                {rubric.map((c) => (
                  <th key={c.id} className="px-2 py-3 font-medium text-center" title={c.label}>
                    {c.shortLabel}
                    <span className="block text-[0.65rem] font-normal">{Math.round(c.weight * 100)}%</span>
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Consensus</th>
                <th className="px-4 py-3 font-medium">Mandatory</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...ranked, ...failed.map((f) => ({ ...f, rank: null as number | null, shortlisted: false }))].map((v) => {
                const means = rubric.map((c) => {
                  const xs = v.judgeRows
                    .filter((j) => j.result.complete)
                    .map((j) => j.scores[c.id])
                    .filter((n): n is number => typeof n === "number");
                  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
                });
                return (
                  <tr key={v.response.id} className={`border-t border-line ${v.rank == null ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-navy">
                      {v.rank ?? <XCircle size={16} className="text-red-600" />}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{v.response.vendorName}</p>
                      {v.shortlisted && <Badge variant="accent" className="mt-1">Shortlisted</Badge>}
                    </td>
                    {means.map((m, i) => (
                      <td key={rubric[i].id} className="px-2 py-3 text-center">
                        <HeatCell value={m} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <ScoreValue score={v.consensus} />
                    </td>
                    <td className="px-4 py-3">
                      <MandatoryBadge status={v.mandatoryStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={detailHref(v.response.id)} className="text-accent hover:text-navy inline-flex items-center gap-1 font-medium">
                        Open <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {unscored.map((v) => (
                <tr key={v.response.id} className="border-t border-line text-muted">
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">{v.response.vendorName}</td>
                  <td className="px-4 py-3 italic" colSpan={rubric.length + 3}>
                    Awaiting committee scorecards{v.ai ? " (AI evaluation done)" : ""}
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={rubric.length + 5} className="px-4 py-10 text-center text-muted">
                    No responses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <p className="text-xs text-muted">
        Criterion columns show the mean committee score (complete scorecards). Vendors with a failed mandatory
        requirement are listed below the ranking and can&rsquo;t be shortlisted, whatever their score.
      </p>
    </div>
  );
}

function HeatCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted text-xs">—</span>;
  const t = (value - 1) / 4;
  const bg = `rgba(31, 51, 80, ${0.08 + t * 0.62})`;
  return (
    <span
      className="inline-block min-w-10 rounded px-1.5 py-1 font-mono text-xs"
      style={{ backgroundColor: bg, color: t > 0.55 ? "white" : "#1f3350" }}
    >
      {value.toFixed(1)}
    </span>
  );
}
