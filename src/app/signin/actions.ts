"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, ensureDb, users } from "@/lib/db/client";
import { checkDemoAccessCode, grantDemoAccess, hasDemoAccess, setSession } from "@/lib/auth";

export async function signInAs(formData: FormData) {
  await ensureDb();
  const userId = String(formData.get("userId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!(await hasDemoAccess())) {
    if (!checkDemoAccessCode(code)) redirect("/signin?error=code");
    await grantDemoAccess();
  }
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) redirect("/signin?error=user");
  await setSession(u.id);
  redirect("/evaluate");
}

export async function enterAccessCode(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "/demo");
  if (!checkDemoAccessCode(code)) redirect(`/demo?error=code`);
  await grantDemoAccess();
  redirect(next.startsWith("/") ? next : "/demo");
}
