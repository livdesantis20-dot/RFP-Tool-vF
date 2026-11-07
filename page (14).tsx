import { redirect } from "next/navigation";
import { inArray, sql } from "drizzle-orm";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { db, insightsCache } from "@/lib/db/client";
import { loadVendorSummaries, formatUsd } from "@/lib/summary";
import { aiConfigured } from "@/lib/ai/client";
import {
  buildVendorInsights,
  buildJudgeProfiles,
  buildCriterionDistributions,
  mean,
  type JudgeRow,
  type AgentRow,
} from "@/lib/insights/compute";
import { buildJudgeAnonMap } from "@/lib/insights/anonymize";
import { summarizeVendorThemes, type VendorTheme } from "@/lib/insights/themes";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { HistogramChart, BarChartH, SpreadChart, AiVsHumanScatter } from "./charts";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const isCoordinator = session.user.role === "coordinator";
  const rfp = await getRfp();
  if (!isCoordinator && !rfp.resultsPublished) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-3xl">Evaluation insights</h1>
        <p className="text-muted mt-3">Insights become visible once the coordinators publish results.</p>
      </div>
    );
  }

  const { rubric, vendors } = await loadVendorSummaries(rfp);
  const judgeRows: JudgeRow[] = vendors.flatMap((v) =>
    v.judgeRows.map((j) => ({ responseId: j.responseId, judgeUserId: j.judgeUserId, scores: j.scores, notes: j.notes }))
  );
  const judgesByResponse = new Map<number, JudgeRow[]>();
  for (const j of judgeRows) {
    if (!judgesByResponse.has(j.responseId)) judgesByResponse.set(j.responseId, []);
    judgesByResponse.get(j.responseId)!.push(j);
  }
  const agentRows: AgentRow[] = vendors
    .filter((v) => v.ai)
    .map((v) => ({ responseId: v.response.id, scores: v.ai!.scores, total: v.ai!.total }));
  const agentMap = new Map(agentRows.map((a) => [a.responseId, a]));
  const vlist = vendors.map((v) => ({ id: v.response.id, vendorName: v.response.vendorName }));

  const anon = buildJudgeAnonMap(judgeRows.map((j) => j.judgeUserId));
  const vInsights = buildVendorInsights(vlist, judgesByResponse, agentMap, rubric);
  const profiles = buildJudgeProfiles(judgeRows, rubric);
  const dists = buildCriterionDistributions(judgeRows, agentRows, rubric);

  const judgeBars = profiles
    .filter((p) => p.meanScore != null)
    .map((p) => ({ label: `${anon.get(p.judgeUserId)} · n=${p.count}`, value: Number(p.meanScore!.toFixed(2)) }))
    .sort((a, b) => a.value - b.value);
  const spread = vInsights
    .filter((s) => s.judgeCount >= 2 && s.judgeStd != null)
    .map((s) => ({ label: `${s.vendorName} (n=${s.judgeCount})`, std: Number(s.judgeStd!.toFixed(2)) }))
    .sort((a, b) => b.std - a.std);
  const scatter = vInsights
    .filter((s) => s.agentTotal != null && s.judgeMean != null)
    .map((s) => ({ human: s.judgeMean!, agent: s.agentTotal!, vendor: s.vendorName }));
  const meanDelta = mean(vInsights.map((s) => s.agentHumanDelta).filter((n): n is number => n != null));

  const pricing = vendors
    .filter((v) => v.ai)
    .map((v) => ({
      vendor: v.response.vendorName,
      total: v.ai!.result.pricing.estimatedTotalUsd,
      term: v.ai!.result.pricing.termYears,
      summary: v.ai!.result.pricing.totalCostSummary,
      concerns: v.ai!.result.pricing.concerns.length,
      consensus: v.consensus,
    }))
    .sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));

  // Per-vendor committee note themes (cached; generated in the background on coordinator visits).
  const keys = vlist.map((v) => `themes:${v.id}`);
  const cached = keys.length ? await db.select().from(insightsCache).where(inArray(insightsCache.key, keys)) : [];
  const themes = new Map<number, { theme: VendorTheme; noteCount: number }>();
  for (const c of cached) {
    const p = c.payload as { theme: VendorTheme; noteCount: number };
    themes.set(Number(c.key.replace("themes:", "")), p);
  }
  const notesFor = (id: number) =>
    (judgesByResponse.get(id) ?? []).map((j) => j.notes).filter((n) => n.trim().length > 0);
  const missing = vlist.filter((v) => {
    const n = notesFor(v.id).length;
    return n > 0 && themes.get(v.id)?.noteCount !== n;
  });
  if (isCoordinator && missing.length > 0 && aiConfigured()) {
    after(async () => {
      for (const v of missing) {
        try {
          const notes = notesFor(v.id);
          const theme = await summarizeVendorThemes(v.vendorName, notes);
          if (!theme) continue;
          const payload = { theme, noteCount: notes.length };
          await db
            .insert(insightsCache)
            .values({ key: `themes:${v.id}`, payload })
            .onConflictDoUpdate({ target: insightsCache.key, set: { payload, updatedAt: sql`now()` } });
        } catch (e) {
          console.warn(`[insights] themes for ${v.id} failed:`, e);
        }
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <span className="kicker">Analysis</span>
        <h1 className="font-display text-3xl mt-1">Evaluation insights</h1>
        <p className="text-muted text-sm mt-1">
          Score distributions, evaluator calibration, AI-vs-committee agreement, cost comparison, and
          summarized committee themes.
          {isCoordinator && !rfp.resultsPublished && <span className="ml-2 text-accent font-medium">· Coordinator preview</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Responses" value={String(vendors.length)} />
        <Tile label="Complete scorecards" value={String(vendors.reduce((s, v) => s + v.completeCount, 0))} />
        <Tile label="Evaluators active" value={String(profiles.length)} />
        <Tile label="AI evaluations" value={`${agentRows.length} / ${vendors.length}`} />
      </div>

      {pricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost comparison (from pricing sheets)</CardTitle>
          </CardHeader>
          <CardBody className="p-0 sm:p-0 table-scroll">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-mist text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Est. total</th>
                  <th className="px-4 py-3 font-medium">Term</th>
                  <th className="px-4 py-3 font-medium">What it covers</th>
                  <th className="px-4 py-3 font-medium">Concerns</th>
                  <th className="px-4 py-3 font-medium">Consensus</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
                  <tr key={p.vendor} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-medium text-navy">{p.vendor}</td>
                    <td className="px-4 py-3 font-mono text-navy">{formatUsd(p.total)}</td>
                    <td className="px-4 py-3 text-navy">{p.term ? `${p.term} yrs` : "—"}</td>
                    <td className="px-4 py-3 text-muted">{p.summary}</td>
                    <td className="px-4 py-3 text-navy">{p.concerns}</td>
                    <td className="px-4 py-3 font-mono text-navy">{p.consensus?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted px-4 py-3 border-t border-line">
              Totals are the AI evaluator&rsquo;s reading of each pricing sheet — verify against the source files
              before using them in a recommendation.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Score distribution per criterion</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-muted mb-4">Share of scores at each level, normalized so the AI series is comparable to the committee&rsquo;s.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dists.map((d) => (
              <div key={d.criterionId}>
                <p className="text-sm font-medium text-navy">{d.label}</p>
                <p className="text-xs text-muted font-mono mb-1">
                  {Math.round(d.weight * 100)}%
                  {d.humanMean != null ? ` · committee μ ${d.humanMean.toFixed(2)}` : ""}
                  {d.aiMean != null ? ` · AI μ ${d.aiMean.toFixed(2)}` : ""}
                </p>
                <HistogramChart data={d.histogram} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {judgeBars.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evaluator calibration</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-muted mb-4">Mean weighted total per evaluator (anonymized). Large gaps suggest a calibration discussion.</p>
              <BarChartH data={judgeBars} height={Math.max(180, judgeBars.length * 40)} domain={[0, 5]} />
            </CardBody>
          </Card>
        )}
        {spread.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Where evaluators disagree</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-muted mb-4">Standard deviation of committee totals per vendor. Higher = more disagreement to resolve.</p>
              <SpreadChart data={spread} />
            </CardBody>
          </Card>
        )}
      </div>

      {scatter.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI evaluator vs. committee</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-muted mb-4">
              Above the dashed line, the AI scored the vendor higher than the committee did.
              {meanDelta != null && <span className="ml-2 font-mono">Mean Δ (AI − committee) = {meanDelta.toFixed(2)}</span>}
            </p>
            <AiVsHumanScatter data={scatter} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Committee themes by vendor</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-muted mb-5">
            A synthesis of all evaluators&rsquo; overall notes on each vendor, never attributed to individuals.
            {isCoordinator && missing.length > 0 && aiConfigured() && (
              <span className="ml-1 text-accent font-medium">Generating {missing.length} — refresh in about 30 seconds.</span>
            )}
          </p>
          <div className="space-y-4">
            {vlist.map((v) => {
              const t = themes.get(v.id)?.theme;
              const n = notesFor(v.id).length;
              return (
                <div key={v.id} className="border border-line rounded-md p-4">
                  <p className="font-medium text-navy">{v.vendorName}</p>
                  <p className="text-xs text-muted mb-2">
                    {n} evaluator{n === 1 ? "" : "s"} with notes
                  </p>
                  {t ? (
                    <>
                      <p className="text-sm text-navy">{t.summary}</p>
                      <div className="grid md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-line">
                        <Themes title="Strengths" items={t.strengths} cls="text-emerald-700" />
                        <Themes title="Concerns" items={t.concerns} cls="text-amber-700" />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted italic">
                      {n === 0 ? "No overall notes to summarize yet." : "Summary pending."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl text-navy mt-1">{value}</p>
      </CardBody>
    </Card>
  );
}

function Themes({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${cls}`}>{title}</p>
      <ul className="text-sm text-navy space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${cls} shrink-0`}>•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
