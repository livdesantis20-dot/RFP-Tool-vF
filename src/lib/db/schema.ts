import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  primaryKey,
  serial,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";

// Keep in sync with src/lib/db/bootstrap.ts (the SQL that creates these tables).

export const roleEnum = pgEnum("role", ["coordinator", "judge"]);

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});

export type Role = "coordinator" | "judge";
export type ScoreMap = Record<string, number | null>;
export type MandatoryStatus = "pass" | "fail" | "unclear";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  title: text("title"),
  organization: text("organization"),
  role: roleEnum("role").notNull().default("judge"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Singleton (id = 1): the RFP being evaluated and how it is scored.
export const rfpSettings = pgTable("rfp_settings", {
  id: integer("id").primaryKey().default(1),
  clientName: text("client_name").notNull().default(""),
  procurementTitle: text("procurement_title").notNull().default(""),
  scopeSummary: text("scope_summary").notNull().default(""),
  issuedDate: text("issued_date"),
  responseDueDate: text("response_due_date"),
  rfpFileUrl: text("rfp_file_url"),
  rfpFileName: text("rfp_file_name"),
  mandatoryRequirements: jsonb("mandatory_requirements").$type<string[]>().notNull().default([]),
  weights: jsonb("weights").$type<Record<string, number>>().notNull().default({}),
  aiWeight: real("ai_weight").notNull().default(0.05),
  shortlistSize: integer("shortlist_size").notNull().default(3),
  resultsPublished: boolean("results_published").notNull().default(false),
  // Set once the demo starting point has been loaded (or the data was cleared on
  // purpose), so a server restart doesn't re-seed over someone's work.
  demoSeeded: boolean("demo_seeded").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per participating firm's RFP response.
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  summary: text("summary").notNull().default(""),
  responseFileUrl: text("response_file_url").notNull(),
  responseFileName: text("response_file_name").notNull(),
  responsePageCount: integer("response_page_count"),
  pricingFileUrl: text("pricing_file_url").notNull(),
  pricingFileName: text("pricing_file_name").notNull(),
  // Coordinator's confirmation of each mandatory requirement (keyed by requirement
  // text). Overrides the AI's read when set.
  mandatoryReview: jsonb("mandatory_review")
    .$type<Record<string, MandatoryStatus>>()
    .notNull()
    .default({}),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiEvaluations = pgTable("ai_evaluations", {
  responseId: integer("response_id")
    .primaryKey()
    .references(() => responses.id, { onDelete: "cascade" }),
  scores: jsonb("scores").$type<ScoreMap>().notNull(),
  result: jsonb("result").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const judgeScores = pgTable(
  "judge_scores",
  {
    responseId: integer("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    judgeUserId: text("judge_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scores: jsonb("scores").$type<ScoreMap>().notNull().default({}),
    criterionNotes: jsonb("criterion_notes").$type<Record<string, string>>().notNull().default({}),
    notes: text("notes").notNull().default(""),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.responseId, t.judgeUserId] })]
);

// Uploaded files when Vercel Blob isn't configured (local dev / demo).
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insightsCache = pgTable("insights_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type RfpSettings = typeof rfpSettings.$inferSelect;
export type ResponseRow = typeof responses.$inferSelect;
export type AiEvaluationRow = typeof aiEvaluations.$inferSelect;
export type JudgeScoreRow = typeof judgeScores.$inferSelect;
