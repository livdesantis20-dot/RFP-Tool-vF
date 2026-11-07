import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { FIRM } from "@/lib/brand";

// Fictional demo people and a fictional client. Edit freely on the RFP setup page.
export const DEMO_USERS: (typeof schema.users.$inferInsert)[] = [
  {
    id: "u-coord-1",
    name: "Avery Thompson",
    email: "avery.thompson@example.com",
    title: "Engagement Director",
    organization: FIRM.name,
    role: "coordinator",
  },
  {
    id: "u-coord-2",
    name: "Morgan Lee",
    email: "morgan.lee@example.com",
    title: "Senior Consultant",
    organization: FIRM.name,
    role: "coordinator",
  },
  {
    id: "u-judge-1",
    name: "Dana Whitfield",
    email: "dana.whitfield@example.com",
    title: "Chief Financial Officer",
    organization: "Steering Committee",
    role: "judge",
  },
  {
    id: "u-judge-2",
    name: "Raj Patel",
    email: "raj.patel@example.com",
    title: "Chief Information Officer",
    organization: "Steering Committee",
    role: "judge",
  },
  {
    id: "u-judge-3",
    name: "Elena Garcia",
    email: "elena.garcia@example.com",
    title: "VP, Operations",
    organization: "Steering Committee",
    role: "judge",
  },
  {
    id: "u-judge-4",
    name: "Marcus Bell",
    email: "marcus.bell@example.com",
    title: "Corporate Controller",
    organization: "Steering Committee",
    role: "judge",
  },
];

export const DEFAULT_RFP = {
  id: 1,
  clientName: "Riverbend Industries",
  procurementTitle: "ERP Modernization — Software & Implementation Partner RFP",
  scopeSummary:
    "Riverbend Industries is replacing its on-premise legacy ERP with a cloud ERP covering finance, procurement, inventory, manufacturing, and order-to-cash across 4 plants and 2 distribution centers (~650 users). The RFP covers software subscription plus the implementation partner. Target go-live is within 14 months of contract signature, with a phased rollout starting with finance.",
  issuedDate: "2026-09-08",
  responseDueDate: "2026-10-16",
  mandatoryRequirements: [
    "SOC 1 Type II and SOC 2 Type II reports available for the hosted service",
    "Data residency in the United States",
    "Native multi-entity, multi-currency general ledger",
    "Pricing submitted on the required pricing sheet with a 5-year total cost",
    "Named implementation lead with at least two comparable ERP go-lives",
  ],
};

type DB = PostgresJsDatabase<typeof schema>;

export async function seedDefaults(db: DB) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.users);
  if (Number(count) === 0) {
    await db.insert(schema.users).values(DEMO_USERS).onConflictDoNothing();
  }
  await db.insert(schema.rfpSettings).values(DEFAULT_RFP).onConflictDoNothing();
}
