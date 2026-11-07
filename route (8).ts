import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureDb, responses, users } from "@/lib/db/client";
import { hasDemoAccess, sessionCookie } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { DEMO_STEPS, STEP_COOKIE } from "@/lib/demo-steps";
import { DEMO_USERS } from "@/lib/db/seed";

// Moves the guided tour to step N: signs in as that step's person, remembers the step
// (for the banner), and lands on the step's page.
export async function GET(req: Request, ctx: { params: Promise<{ step: string }> }) {
  const base = new URL(req.url);
  if (!DEMO_MODE) return NextResponse.redirect(new URL("/", base));
  if (!(await hasDemoAccess())) return NextResponse.redirect(new URL("/demo", base));
  await ensureDb();

  const { step } = await ctx.params;
  const n = Number(step);
  const s = DEMO_STEPS[n - 1];
  if (!Number.isInteger(n) || !s) return NextResponse.redirect(new URL("/demo", base));

  let target = s.target;
  if (target.startsWith("vendor:")) {
    const name = target.slice("vendor:".length);
    const [row] = await db.select({ id: responses.id }).from(responses).where(eq(responses.vendorName, name)).limit(1);
    target = row ? `/evaluate/${row.id}` : "/evaluate";
  }

  const res = NextResponse.redirect(new URL(target, base));
  if (s.as) {
    // Restore the demo person if someone removed them.
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, s.as)).limit(1);
    if (!u) {
      const demo = DEMO_USERS.find((d) => d.id === s.as);
      if (demo) await db.insert(users).values(demo).onConflictDoNothing();
    }
    const c = sessionCookie(s.as);
    res.cookies.set(c.name, c.value, c.options);
  }
  res.cookies.set(STEP_COOKIE, String(n), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 12 });
  return res;
}
