"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasDemoAccess, clearSession } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { STEP_COOKIE } from "@/lib/demo-steps";
import { ensureDb } from "@/lib/db/client";
import { loadDemoSnapshot } from "@/lib/sample/load";

// Anyone with demo access can put the demo back to its starting point.
export async function resetDemoToStart() {
  if (!DEMO_MODE) redirect("/");
  if (!(await hasDemoAccess())) redirect("/demo");
  await ensureDb();
  await loadDemoSnapshot();
  (await cookies()).delete(STEP_COOKIE);
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/demo?reset=1");
}
