"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import {
  db,
  rfpSettings,
  users,
  responses,
  aiEvaluations,
  judgeScores,
  files,
  insightsCache,
} from "@/lib/db/client";
import { requireCoordinator } from "@/lib/auth";
import { CRITERION_IDS } from "@/lib/criteria";
import { isAllowedUrl } from "@/lib/files/storage";
import { DEFAULT_RFP } from "@/lib/db/seed";
import { loadDemoSnapshot } from "@/lib/sample/load";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const rfpSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required").max(160),
  procurementTitle: z.string().trim().min(1, "Procurement title is required").max(200),
  scopeSummary: z.string().max(6000),
  issuedDate: z.string().max(20),
  responseDueDate: z.string().max(20),
  rfpFile: z.object({ url: z.string(), name: z.string() }).nullable(),
  mandatoryRequirements: z.array(z.string().trim().min(1).max(400)).max(30),
  weights: z.record(z.string(), z.number().min(0).max(100)),
  aiWeightPct: z.number().min(0).max(50),
  shortlistSize: z.number().int().min(1).max(10),
});

export async function saveRfpSettings(input: z.input<typeof rfpSchema>): Promise<Result> {
  await requireCoordinator();
  const p = rfpSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => i.message).join("; ") };
  const d = p.data;
  const total = CRITERION_IDS.reduce((s, id) => s + (d.weights[id] ?? 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, error: `Criterion weights must total 100% (currently ${total}%).` };
  }
  if (d.rfpFile && !isAllowedUrl(d.rfpFile.url)) return { ok: false, error: "Re-upload the RFP document." };
  const weights = Object.fromEntries(CRITERION_IDS.map((id) => [id, (d.weights[id] ?? 0) / 100]));

  await db
    .update(rfpSettings)
    .set({
      clientName: d.clientName,
      procurementTitle: d.procurementTitle,
      scopeSummary: d.scopeSummary,
      issuedDate: d.issuedDate || null,
      responseDueDate: d.responseDueDate || null,
      rfpFileUrl: d.rfpFile?.url ?? null,
      rfpFileName: d.rfpFile?.name ?? null,
      mandatoryRequirements: Array.from(new Set(d.mandatoryRequirements)),
      weights,
      aiWeight: d.aiWeightPct / 100,
      shortlistSize: d.shortlistSize,
      updatedAt: sql`now()`,
    })
    .where(eq(rfpSettings.id, 1));
  revalidatePath("/", "layout");
  return { ok: true };
}

const personSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  title: z.string().trim().max(120),
  role: z.enum(["coordinator", "judge"]),
});

export async function addPerson(input: z.input<typeof personSchema>): Promise<Result> {
  await requireCoordinator();
  const p = personSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Name and a valid email are required." };
  const d = p.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email.toLowerCase())).limit(1);
  if (exists) return { ok: false, error: "Someone with that email already exists." };
  await db.insert(users).values({
    id: `u-${randomUUID()}`,
    name: d.name,
    email: d.email.toLowerCase(),
    title: d.title || null,
    organization: d.role === "coordinator" ? "Magazine Street Advisors" : "Steering Committee",
    role: d.role,
  });
  revalidatePath("/rfp");
  revalidatePath("/signin");
  return { ok: true };
}

export async function removePerson(id: string): Promise<Result> {
  const me = await requireCoordinator();
  if (id === me.id) return { ok: false, error: "You can't remove yourself." };
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/rfp");
  revalidatePath("/signin");
  return { ok: true };
}

export async function loadSampleRfp(): Promise<Result> {
  await requireCoordinator();
  try {
    const r = await loadDemoSnapshot();
    revalidatePath("/", "layout");
    return { ok: true, message: `Demo starting point restored: ${r.vendors} vendor responses with AI evaluations and committee scorecards.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Clears all vendor responses, scores and uploads, and restores the default RFP —
// for setting up a real RFP. People are kept. Doesn't re-seed on restart.
export async function resetDemo(): Promise<Result> {
  await requireCoordinator();
  await db.delete(judgeScores);
  await db.delete(aiEvaluations);
  await db.delete(responses);
  await db.delete(insightsCache);
  await db.delete(files);
  await db
    .update(rfpSettings)
    .set({
      ...DEFAULT_RFP,
      rfpFileUrl: null,
      rfpFileName: null,
      weights: {},
      aiWeight: 0.05,
      shortlistSize: 3,
      resultsPublished: false,
      demoSeeded: true,
      updatedAt: sql`now()`,
    })
    .where(eq(rfpSettings.id, 1));
  revalidatePath("/", "layout");
  return { ok: true, message: "All data cleared." };
}
