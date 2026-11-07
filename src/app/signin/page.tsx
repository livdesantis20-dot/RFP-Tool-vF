import { asc } from "drizzle-orm";
import { db, ensureDb, users } from "@/lib/db/client";
import { demoAccessCodeRequired, hasDemoAccess, ROLE_LABEL } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import Link from "next/link";
import { Compass } from "lucide-react";
import { FIRM } from "@/lib/brand";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInAs } from "./actions";
import { ArrowRight, ClipboardList, Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureDb();
  const { error } = await searchParams;
  const all = await db.select().from(users).orderBy(asc(users.name));
  const coordinators = all.filter((u) => u.role === "coordinator");
  const judges = all.filter((u) => u.role === "judge");
  const needsCode = demoAccessCodeRequired() && !(await hasDemoAccess());

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <span className="kicker">Demo sign-in</span>
      <h1 className="font-display text-3xl mt-2">Who&rsquo;s signing in?</h1>
      <p className="text-muted mt-2 max-w-2xl">
        This demo uses role-based sign-in instead of single sign-on. Pick a person to see the portal
        from their point of view. Coordinators manage the people list on the RFP setup page.
      </p>

      {DEMO_MODE && (
        <Link
          href="/demo"
          className="mt-6 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent-tint/50 px-4 py-3 text-sm text-navy hover:border-accent"
        >
          <Compass size={18} className="text-accent shrink-0" />
          <span>
            <strong>First time here?</strong> Take the guided demo. It signs you in as the right person
            at each step and tells you what to look at.
          </span>
        </Link>
      )}

      {error === "code" && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          That access code isn&rsquo;t right.
        </p>
      )}

      <form action={signInAs} className="mt-8 space-y-8">
        {needsCode && (
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-navy mb-1.5" htmlFor="code">
              Demo access code
            </label>
            <Input id="code" name="code" type="password" required autoComplete="off" />
          </div>
        )}

        <Group
          icon={<ClipboardList size={18} />}
          title={`${ROLE_LABEL.coordinator}s · ${FIRM.name}`}
          sub="Set up the RFP, upload each firm's response and pricing sheet, run the AI evaluator, confirm mandatory requirements, and publish results."
          people={coordinators}
        />
        <Group
          icon={<Gavel size={18} />}
          title="Steering Committee · Evaluators"
          sub="Review each response and score it independently against the weighted criteria."
          people={judges}
        />
      </form>
    </div>
  );
}

function Group({
  icon,
  title,
  sub,
  people,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  people: { id: string; name: string; title: string | null; organization: string | null }[];
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-navy">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted mt-1">{sub}</p>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {people.map((p) => (
          <Card key={p.id} className="hover:border-accent/60 transition-colors">
            <CardBody className="p-0 sm:p-0">
              <button
                type="submit"
                name="userId"
                value={p.id}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <span>
                  <span className="block font-medium text-navy">{p.name}</span>
                  <span className="block text-xs text-muted">
                    {[p.title, p.organization].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ArrowRight size={16} className="text-accent shrink-0" />
              </button>
            </CardBody>
          </Card>
        ))}
        {people.length === 0 && <p className="text-sm text-muted">No one in this role yet.</p>}
      </div>
    </section>
  );
}
