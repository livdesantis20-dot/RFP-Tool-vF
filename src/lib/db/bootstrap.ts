// Idempotent schema creation. Runs once per server start (see src/instrumentation.ts)
// against either the embedded local database or DATABASE_URL.
// Keep in sync with src/lib/db/schema.ts.
export const BOOTSTRAP_SQL = `
DO $$ BEGIN
  CREATE TYPE "role" AS ENUM ('coordinator', 'judge');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "title" text,
  "organization" text,
  "role" "role" NOT NULL DEFAULT 'judge',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rfp_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "client_name" text NOT NULL DEFAULT '',
  "procurement_title" text NOT NULL DEFAULT '',
  "scope_summary" text NOT NULL DEFAULT '',
  "issued_date" text,
  "response_due_date" text,
  "rfp_file_url" text,
  "rfp_file_name" text,
  "mandatory_requirements" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "weights" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ai_weight" real NOT NULL DEFAULT 0.05,
  "shortlist_size" integer NOT NULL DEFAULT 3,
  "results_published" boolean NOT NULL DEFAULT false,
  "demo_seeded" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
ALTER TABLE "rfp_settings" ADD COLUMN IF NOT EXISTS "demo_seeded" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "responses" (
  "id" serial PRIMARY KEY,
  "vendor_name" text NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "summary" text NOT NULL DEFAULT '',
  "response_file_url" text NOT NULL,
  "response_file_name" text NOT NULL,
  "response_page_count" integer,
  "pricing_file_url" text NOT NULL,
  "pricing_file_name" text NOT NULL,
  "mandatory_review" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "uploaded_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_evaluations" (
  "response_id" integer PRIMARY KEY REFERENCES "responses"("id") ON DELETE CASCADE,
  "scores" jsonb NOT NULL,
  "result" jsonb NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "judge_scores" (
  "response_id" integer NOT NULL REFERENCES "responses"("id") ON DELETE CASCADE,
  "judge_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scores" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "criterion_notes" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "notes" text NOT NULL DEFAULT '',
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("response_id", "judge_user_id")
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "data" bytea NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "insights_cache" (
  "key" text PRIMARY KEY,
  "payload" jsonb NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
`;
