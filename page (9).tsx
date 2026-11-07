import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, RotateCcw, UserRound } from "lucide-react";
import { demoAccessCodeRequired, hasDemoAccess } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { DEMO_STEPS } from "@/lib/demo-steps";
import { getRfp } from "@/lib/rfp";
import { FIRM } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { enterAccessCode } from "../signin/actions";
import { resetDemoToStart } from "./actions";
import { ResetButton } from "./reset-button";

export const dynamic = "force-dynamic";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  if (!DEMO_MODE) redirect("/");
  const { error, reset } = await searchParams;
  const rfp = await getRfp();
  const locked = demoAccessCodeRequired() && !(await hasDemoAccess());

  return (
    <div>
      <section className="brand-hero text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
          <span className="kicker kicker-light">Guided demo</span>
          <h1 className="mt-3 font-display text-white text-[clamp(1.9rem,4vw,3rem)] leading-tight">
            Run an RFP evaluation from start to finish
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-3xl">
            {`${rfp.clientName || "A client"} has hired ${FIRM.name} to select a new ERP system. Three firms responded. You’ll see the evaluation from both sides: the MSA coordinator running the RFP, and the client’s steering committee scoring it.`}
          </p>
          <p className="mt-3 flex items-center gap-2 text-white/70 text-sm">
            <Clock size={15} /> About 10 minutes · {DEMO_STEPS.length} steps · a bar at the top of each page
            tells you what to do next
          </p>

          {locked ? (
            <form action={enterAccessCode} className="mt-8 max-w-sm">
              <input type="hidden" name="next" value="/demo" />
              <label htmlFor="code" className="block text-sm text-white/80 mb-1.5">
                Enter the access code you were given
              </label>
              <div className="flex gap-2">
                <Input id="code" name="code" type="password" required autoComplete="off" className="text-ink" />
                <Button type="submit" variant="accent">
                  Continue
                </Button>
              </div>
              {error === "code" && <p className="mt-2 text-sm text-red-200">That code isn&rsquo;t right.</p>}
            </form>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                {/* Full navigation on purpose: the step route sets cookies and redirects. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/demo/go/1">
                  Start the tour <ArrowRight size={18} />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="!bg-transparent !text-white !border-white/40 hover:!bg-white/10"
              >
                <Link href="/signin">Explore on my own</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-10">
        {reset && (
          <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-4 py-3">
            The demo is back at its starting point. Start the tour whenever you&rsquo;re ready.
          </p>
        )}

        <section>
          <h2 className="font-display text-2xl">What you&rsquo;ll do</h2>
          <ol className="mt-5 space-y-3">
            {DEMO_STEPS.map((s, i) => (
              <li key={s.title}>
                <Card>
                  <CardBody className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <span className="w-9 h-9 shrink-0 rounded-md bg-navy text-white font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy">{s.title}</p>
                      {s.asLabel && (
                        <p className="text-xs text-accent mt-0.5 flex items-center gap-1">
                          <UserRound size={12} /> As {s.asLabel}
                        </p>
                      )}
                      <ul className="mt-2 space-y-1 text-sm text-muted">
                        {s.detail.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    {!locked && (
                      <a
                        href={`/demo/go/${i + 1}`}
                        className="text-sm font-medium text-accent hover:text-navy inline-flex items-center gap-1 shrink-0"
                      >
                        Go to step <ArrowRight size={14} />
                      </a>
                    )}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-display text-xl">About this demo</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Everything here is fictional: the client, the vendors, the people and their documents.</li>
              <li>
                Sign-in is simplified for the demo. You pick who you are; a real engagement would use your
                organization&rsquo;s single sign-on.
              </li>
              <li>The AI evaluator is real: uploading a response runs a live evaluation of its documents.</li>
            </ul>
          </div>
          {!locked && (
            <div>
              <h2 className="font-display text-xl">Start over</h2>
              <p className="mt-3 text-sm text-muted">
                Put everything back the way it was at the start (scores, uploads, published results) so you
                or a colleague can take the tour fresh.
              </p>
              <form action={resetDemoToStart} className="mt-4">
                <ResetButton>
                  <RotateCcw size={14} /> Reset the demo
                </ResetButton>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
