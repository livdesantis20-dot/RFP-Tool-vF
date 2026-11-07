import { and, eq, sql } from "drizzle-orm";
import {
  db,
  rfpSettings,
  responses,
  aiEvaluations,
  judgeScores,
  insightsCache,
  files,
  users,
} from "@/lib/db/client";
import { saveLocalFile } from "@/lib/files/storage";
import { DEFAULT_RFP, DEMO_USERS } from "@/lib/db/seed";
import { FIRM } from "@/lib/brand";
import { makeDeckPdf, makeXlsx } from "./files";
import { SAMPLE_RFP_SECTIONS, SAMPLE_VENDORS, SAMPLE_UPLOAD_VENDOR, type Vendor } from "./content";
import { SAMPLE_SCORECARDS, toScoreMap } from "./scorecards";
import snapshot from "./demo-snapshot.json";
import { DEMO_MODE } from "@/lib/demo";

const PDF = "application/pdf";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Snapshot = {
  ai: Record<string, { scores: Record<string, number | null>; result: unknown; model: string }>;
  themes: Record<string, unknown>;
};
const SNAP = snapshot as Snapshot;

function slug(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "-");
}

export async function vendorFiles(v: Vendor) {
  const deck = await makeDeckPdf({
    title: `${v.name}: Response to ${DEFAULT_RFP.clientName} ERP Modernization RFP`,
    subtitle: `Prepared for ${DEFAULT_RFP.clientName} · Contact: ${v.contact}`,
    footer: `${v.name} — Confidential response`,
    brandColor: v.color,
    sections: v.sections,
  });
  const pricing = await makeXlsx(v.pricing);
  return {
    deck: { name: `${slug(v.name)}-RFP-Response.pdf`, bytes: deck, pages: v.sections.length + 1 },
    pricing: { name: `${slug(v.name)}-Pricing-Sheet.xlsx`, bytes: pricing },
  };
}

export async function uploadVendorFile(kind: "response" | "pricing") {
  const f = await vendorFiles(SAMPLE_UPLOAD_VENDOR);
  return kind === "response"
    ? { name: f.deck.name, bytes: f.deck.bytes, contentType: PDF }
    : { name: f.pricing.name, bytes: f.pricing.bytes, contentType: XLSX };
}

// Restores the ready-to-demo starting point: the sample RFP, three vendor responses with
// their AI evaluations (from the stored snapshot — no model calls), and three of the four
// committee members' scorecards. Results unpublished. People list restored.
// Sample files are kept in the database (they're small), so this works with or without Blob.
export async function loadDemoSnapshot(): Promise<{ vendors: number; aiFromSnapshot: number }> {
  await db.delete(judgeScores);
  await db.delete(aiEvaluations);
  await db.delete(responses);
  await db.delete(insightsCache);
  await db.delete(files);

  for (const u of DEMO_USERS) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.id,
        set: { name: u.name, email: u.email, title: u.title, organization: u.organization, role: u.role },
      });
  }

  const rfpPdf = await makeDeckPdf({
    title: `Request for Proposal: ${DEFAULT_RFP.procurementTitle}`,
    subtitle: `${DEFAULT_RFP.clientName} · Issued ${DEFAULT_RFP.issuedDate} · Responses due ${DEFAULT_RFP.responseDueDate} · Facilitated by ${FIRM.name}`,
    footer: `${DEFAULT_RFP.clientName} — Confidential RFP`,
    sections: SAMPLE_RFP_SECTIONS,
  });
  const rfpFile = await saveLocalFile({ name: "Riverbend-ERP-RFP.pdf", contentType: PDF, bytes: rfpPdf });
  const rfpValues = {
    ...DEFAULT_RFP,
    rfpFileUrl: rfpFile.url,
    rfpFileName: rfpFile.name,
    weights: {},
    aiWeight: 0.05,
    shortlistSize: 3,
    resultsPublished: false,
    demoSeeded: true,
    updatedAt: new Date(Date.now() - 60_000),
  };
  await db
    .insert(rfpSettings)
    .values(rfpValues)
    .onConflictDoUpdate({ target: rfpSettings.id, set: rfpValues });

  let aiCount = 0;
  for (const v of SAMPLE_VENDORS) {
    const f = await vendorFiles(v);
    const deck = await saveLocalFile({ name: f.deck.name, contentType: PDF, bytes: f.deck.bytes });
    const price = await saveLocalFile({ name: f.pricing.name, contentType: XLSX, bytes: f.pricing.bytes });
    const [row] = await db
      .insert(responses)
      .values({
        vendorName: v.name,
        contactName: v.contact,
        contactEmail: v.email,
        summary: v.notes,
        responseFileUrl: deck.url,
        responseFileName: deck.name,
        responsePageCount: f.deck.pages,
        pricingFileUrl: price.url,
        pricingFileName: price.name,
        uploadedByUserId: "u-coord-1",
        createdAt: new Date(Date.now() - 60_000),
        updatedAt: new Date(Date.now() - 60_000),
      })
      .returning({ id: responses.id });

    const ai = SNAP.ai[v.name];
    if (ai) {
      await db.insert(aiEvaluations).values({ responseId: row.id, scores: ai.scores, result: ai.result, model: ai.model });
      aiCount++;
    }
    for (const [judgeId, cards] of Object.entries(SAMPLE_SCORECARDS)) {
      const c = cards[v.name];
      if (!c) continue;
      await db.insert(judgeScores).values({
        responseId: row.id,
        judgeUserId: judgeId,
        scores: toScoreMap(c.scores),
        criterionNotes: c.criterionNotes ?? {},
        notes: c.notes,
      });
    }
    const theme = SNAP.themes[v.name];
    if (theme) {
      await db.insert(insightsCache).values({ key: `themes:${row.id}`, payload: theme });
    }
  }
  return { vendors: SAMPLE_VENDORS.length, aiFromSnapshot: aiCount };
}

// First start of a demo deployment: load the starting point once.
export async function seedDemoIfNeeded() {
  if (!DEMO_MODE) return;
  // Atomically claim the one-time seed, so two server instances cold-starting together
  // (e.g. on Vercel) don't both load it.
  const claimed = await db
    .update(rfpSettings)
    .set({ demoSeeded: true })
    .where(and(eq(rfpSettings.id, 1), eq(rfpSettings.demoSeeded, false)))
    .returning({ id: rfpSettings.id });
  if (claimed.length === 0) return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(responses);
  if (Number(n) > 0) return; // existing data — never overwrite it
  await loadDemoSnapshot();
}
