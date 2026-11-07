import Link from "next/link";
import { ArrowRight, FileSpreadsheet, FileText, Scale, Sparkles, Users, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries } from "@/lib/summary";
import { FIRM } from "@/lib/brand";
import { DEMO_MODE } from "@/lib/demo";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: FileText, title: "Issue the RFP", sub: `${FIRM.shortName} and the client publish requirements, weights and mandatory conditions.` },
  { icon: FileSpreadsheet, title: "Collect responses", sub: "Each firm submits its response deck and the required pricing sheet." },
  { icon: Sparkles, title: "AI first read", sub: "Every response is read against the same criteria, with evidence and gaps cited." },
  { icon: Users, title: "Committee scoring", sub: "Steering committee members score independently, 1–5 per criterion." },
  { icon: Trophy, title: "Consensus & shortlist", sub: "Weighted totals, a mandatory-requirement gate, and a ranked shortlist." },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(`${d}T12:00:00Z`);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function Home() {
  const session = await auth();
  const rfp = await getRfp();
  const { vendors, judgeCount } = await loadVendorSummaries(rfp);
  const scorecards = vendors.reduce((s, v) => s + v.completeCount, 0);
  const user = session?.user;

  return (
    <>
      <section className="brand-hero text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 md:py-20">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-16 items-start">
            <div>
              <span className="kicker kicker-light">{FIRM.product}</span>
              <h1 className="mt-4 font-display text-white text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.08] tracking-tight">
                {rfp.procurementTitle || "Vendor selection"}
              </h1>
              <p className="mt-4 text-white/80 text-lg max-w-2xl">
                {rfp.clientName ? `Prepared for ${rfp.clientName}. ` : ""}A structured, evidence-based
                downselection facilitated by {FIRM.name}.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {DEMO_MODE && (
                  <Button asChild size="lg" variant="accent">
                    <Link href="/demo">
                      Take the guided demo <ArrowRight size={18} />
                    </Link>
                  </Button>
                )}
                {!DEMO_MODE &&
                  (user ? (
                    <Button asChild size="lg" variant="accent">
                      <Link href="/evaluate">
                        {user.role === "coordinator" ? "Manage responses" : "Start evaluating"} <ArrowRight size={18} />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="accent">
                      <Link href="/signin">
                        Sign in <ArrowRight size={18} />
                      </Link>
                    </Button>
                  ))}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="!bg-transparent !text-white !border-white/40 hover:!bg-white/10"
                >
                  {DEMO_MODE ? (
                    <Link href={user ? "/evaluate" : "/signin"}>Explore on my own</Link>
                  ) : (
                    <Link href="/criteria">Evaluation criteria</Link>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/[0.05] p-5 sm:p-6">
              <p className="kicker kicker-light">Status</p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Stat label="Responses received" value={vendors.length} />
                <Stat label="Committee members" value={judgeCount} />
                <Stat label="Scorecards complete" value={`${scorecards} / ${vendors.length * judgeCount}`} />
                <Stat label="Results" value={rfp.resultsPublished ? "Published" : "In progress"} />
              </dl>
              <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60">RFP issued</p>
                  <p className="text-white font-medium">{fmtDate(rfp.issuedDate)}</p>
                </div>
                <div>
                  <p className="text-white/60">Responses due</p>
                  <p className="text-white font-medium">{fmtDate(rfp.responseDueDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <div className="max-w-2xl">
            <span className="kicker">How the evaluation works</span>
            <h2 className="mt-2 font-display text-3xl">Five steps from RFP to shortlist</h2>
          </div>
          <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="rounded-lg border border-line p-5 bg-mist/40">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-navy text-white flex items-center justify-center">
                      <Icon size={18} />
                    </span>
                    <span className="text-xs font-semibold text-accent">STEP {i + 1}</span>
                  </div>
                  <p className="mt-3 font-semibold text-navy">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">{s.sub}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid md:grid-cols-3 gap-6">
          <Principle
            icon={Scale}
            title="One framework, applied consistently"
            body="Nine weighted criteria and a five-point scale, the same for every vendor. A 3 means the vendor meets requirements; higher scores need evidence of additional value."
          />
          <Principle
            icon={Users}
            title="Independent scoring"
            body="Committee members see only their own scorecards until results are published, so early opinions don't anchor others."
          />
          <Principle
            icon={Sparkles}
            title="AI as an advisor, not the decider"
            body="The AI evaluator reads every page and pricing line, cites evidence, flags gaps and drafts clarification questions. Its score carries a small, configurable weight."
          />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-white/60">{label}</dt>
      <dd className="font-display text-2xl text-white mt-0.5">{value}</dd>
    </div>
  );
}

function Principle({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Icon size={22} className="text-accent" />
      <p className="mt-3 font-semibold text-navy">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
