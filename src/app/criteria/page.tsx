import { getRfp, rubricFor, pct } from "@/lib/rfp";
import { SCORE_SCALE, EVALUATION_INSTRUCTIONS, CRITERIA } from "@/lib/criteria";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CriteriaPage() {
  const rfp = await getRfp();
  const rubric = rubricFor(rfp);
  const tailored = rubric.some((c, i) => c.weight !== CRITERIA[i].weight);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <span className="kicker">Evaluation framework</span>
        <h1 className="font-display text-3xl mt-2">How responses are scored</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Every vendor is assessed on the same evidence — written responses, pricing sheets,
          demonstrations, clarifications and references — against these weighted criteria.
          {tailored && " Weights have been tailored for this RFP."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation criteria</CardTitle>
        </CardHeader>
        <CardBody className="p-0 sm:p-0 table-scroll">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-mist text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Criterion</th>
                <th className="px-4 py-3 font-medium w-20">Weight</th>
                <th className="px-4 py-3 font-medium">Evaluation question and evidence</th>
              </tr>
            </thead>
            <tbody>
              {rubric.map((c) => (
                <tr key={c.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium text-navy">{c.label}</td>
                  <td className="px-4 py-3 font-mono text-navy">{pct(c.weight)}</td>
                  <td className="px-4 py-3">
                    <p className="text-navy">{c.question}</p>
                    <p className="text-muted mt-0.5">Assess: {c.assess}</p>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line bg-mist/60">
                <td className="px-4 py-3 font-semibold text-navy">Total</td>
                <td className="px-4 py-3 font-mono font-semibold text-navy">
                  {pct(rubric.reduce((s, c) => s + c.weight, 0))}
                </td>
                <td className="px-4 py-3 text-muted">Weighted total = Σ(score × weight). Maximum 5.00, × 20 for a score out of 100.</td>
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scoring scale</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted mb-4">
              A 3 means the vendor meets the agreed requirements; higher scores require evidence of
              relevant additional value. Use <strong>Not Evaluated</strong> where evidence is missing.
            </p>
            <ul className="space-y-3">
              {SCORE_SCALE.map((s) => (
                <li key={s.score} className="flex gap-3">
                  <span className="w-8 h-8 shrink-0 rounded-md bg-navy text-white font-semibold flex items-center justify-center">
                    {s.score}
                  </span>
                  <div>
                    <p className="font-medium text-navy text-sm">{s.rating}</p>
                    <p className="text-sm text-muted">{s.definition}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mandatory requirements (pass / fail)</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted mb-4">
              Assessed separately from the weighted score. A high weighted score does not override a
              failed mandatory requirement.
            </p>
            {rfp.mandatoryRequirements.length ? (
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-navy">
                {rfp.mandatoryRequirements.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted italic">None defined for this RFP.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation instructions</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {EVALUATION_INSTRUCTIONS.map((r, i) => (
              <li key={r.title} className="flex gap-3">
                <span className="text-accent font-semibold text-sm w-5 shrink-0">{i + 1}.</span>
                <div>
                  <p className="font-medium text-navy text-sm">{r.title}</p>
                  <p className="text-sm text-muted">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
