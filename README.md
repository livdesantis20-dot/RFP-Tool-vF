# Magazine Street Advisors — RFP Evaluation Portal

A web app for running an RFP downselection end to end. A client hires Magazine Street Advisors to run a large RFP (for example, selecting a new ERP provider). MSA coordinators upload each participating firm's response deck and required pricing sheet, an AI evaluator gives a first, evidence-cited read against the evaluation framework and the issued RFP, and the client's steering committee scores every response independently. The portal then calculates weighted totals, applies the mandatory-requirement gate, and produces a ranked shortlist.

Built with Next.js 16 (App Router), TypeScript, Drizzle ORM on Postgres (embedded PGlite locally, Neon on Vercel), the Anthropic API (Claude), Tailwind CSS v4 and Recharts.

---

## Who uses it

| Role | Who | Can |
|---|---|---|
| **RFP Coordinator** | Magazine Street Advisors staff | Set up the RFP (details, issued RFP document, mandatory requirements, tailored weights, AI weight, shortlist size), manage the evaluation team, upload vendor responses and pricing sheets, run the AI evaluator, confirm mandatory requirements, see every scorecard, preview rankings and insights, publish results |
| **Steering Committee** | The client's evaluators | Open each response and pricing sheet, score each criterion 1–5 or Not Evaluated with the basis for the score, add overall notes. They see only their own scorecards until results are published, then rankings, anonymized scorecards, AI evaluations and insights |

Sign-in is role-based for the demo: no SSO and no passwords. Pick a person on `/signin`. Set `DEMO_ACCESS_CODE` to require a shared code once the app is deployed.

## Evaluation framework

Taken from the Standard RFP Evaluation Framework (`src/lib/criteria.ts`). Weights can be tailored per RFP on **RFP setup** and must total 100%.

| Criterion | Default weight |
|---|---|
| Functional Fit | 20% |
| Technical Fit and Integration | 10% |
| Security, Privacy and Compliance | 10% |
| Usability and Adoption | 10% |
| Implementation and Delivery Approach | 15% |
| Relevant Experience and Team Capability | 10% |
| Support and Ongoing Service | 5% |
| Total Cost and Commercial Value | 15% |
| Strategic Fit and Future Readiness | 5% |

- **Scale:** 1 Does not meet · 2 Partially meets · 3 Meets · 4 Exceeds · 5 Significantly exceeds. **Not Evaluated** marks missing evidence; it is never averaged in.
- **Weighted total** = Σ(score × weight), max 5.00, × 20 for /100. A scorecard counts toward consensus only when every criterion is scored.
- **Consensus** = (1 − AI weight) × mean of complete committee scorecards + AI weight × AI total. The AI weight defaults to 5% and can be set to 0% to make the AI advisory only.
- **Mandatory requirements** are pass/fail and separate from the score. The AI assesses each one, and a coordinator confirms or overrides it. A vendor with a failed requirement is never shortlisted, whatever its score.

## The AI evaluator

`src/lib/ai/evaluate.ts` uses the official Anthropic SDK (`@anthropic-ai/sdk`) with structured output. For each vendor it sends:

1. RFP context: client, scope, dates, mandatory requirements, tailored criteria and the scoring scale, plus the **issued RFP document**. This prefix is marked for prompt caching, so evaluating several vendors in a row reuses it.
2. The vendor's **response deck** (PDFs as native documents; PPTX as slide text and speaker notes).
3. The vendor's **pricing sheet** (XLSX sheets read cell by cell; CSV, PDF and PPTX also accepted).

It returns, per criterion, a score (or Not Evaluated), the rationale with cited evidence, and gaps. It also returns strengths, risks, a pass/fail/unclear read of each mandatory requirement, a structured pricing analysis (estimated total cost, term, one-time and recurring costs, assumptions, concerns), and suggested clarification questions for the vendor. Committee members don't see the AI's output until results are published, so it can't anchor their scoring.

Model: `claude-haiku-5-5` (Claude Haiku 5.5) by default; override with `ANTHROPIC_MODEL`.

## Running locally

Requirements: Node.js 20+ (22 LTS recommended).

```bash
npm install
cp .env.example .env.local   # then add ANTHROPIC_API_KEY (and AUTH_SECRET)
npm run dev                  # http://localhost:3000
```

No database setup is needed. Tables and demo people are created on first start in an embedded Postgres at `~/.msa-rfp-portal/pglite`, outside the project folder so it stays out of OneDrive and git. Uploads are stored in the same database.

## Self-guided demo mode

On by default (`DEMO_MODE=false` turns it off for a real engagement). Built so a client can take the demo with no one explaining it:

- **Ready-made starting point.** A new deployment opens on a fictional ERP RFP (Riverbend Industries) with three vendor responses, their AI evaluations, and scorecards from three of the four committee members. Raj Patel (CIO) is left for the visitor. The AI results come from `src/lib/sample/demo-snapshot.json`, so first load is instant and costs nothing.
- **Guided tour at `/demo`.** Eight steps, about ten minutes. A bar under the navigation shows the step, what to do, and **Next**. Each step signs the visitor in as the right person (coordinator Avery Thompson or committee member Raj Patel) and opens the right page.
- **Hands-on upload.** The upload page offers sample files from a fourth, late bidder (Lakeshore Business Systems), so the visitor can watch a live AI evaluation run on a new response.
- **Access code.** With `DEMO_ACCESS_CODE` set, the visitor enters it once on `/demo` or `/signin`, and it's remembered for 14 days.
- **Reset.** **Reset the demo** on `/demo` (anyone with access), or **Reset to demo starting point** on RFP setup, restores the starting point instantly without calling the AI. **Clear all data** on RFP setup empties everything for a real RFP.

**Refreshing the AI snapshot** (only if you change the sample content in `src/lib/sample/`): reset the demo, re-run the AI evaluator on each of the three vendors as a coordinator, open Insights once so the committee themes generate, then save the output of `/api/demo/snapshot` over `src/lib/sample/demo-snapshot.json`.

## Deploying to Vercel

1. Push the repo to GitHub and import it as a new Vercel project (framework is detected automatically).
2. In the project's **Storage** tab, add a **Neon Postgres** database (sets `DATABASE_URL`) and a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`). Without Neon the demo still works but resets whenever the server goes idle. Without Blob, uploads over about 4.5 MB fail.
3. Add environment variables: `ANTHROPIC_API_KEY` (a dedicated key with a spend limit), `AUTH_SECRET`, `DEMO_ACCESS_CODE`, and `CRON_SECRET`.
4. Deploy. Tables, demo people and the demo starting point are created on first visit. `vercel.json` schedules `/api/cron/evaluate` daily to evaluate any response the AI hasn't read.
5. Before sending it to a client, open `/demo`, take the tour once yourself, then click **Reset the demo**.

Use one deployment (and one database) per client. Everyone using a deployment shares its data.

## Project layout

```
src/
  app/
    page.tsx               Landing page with RFP status
    signin/                Demo role sign-in
    criteria/              Evaluation framework (criteria, scale, instructions, mandatory reqs)
    rfp/                   Coordinator: RFP setup, evaluation team, demo data
    evaluate/              Responses list, upload form, per-vendor detail + scorecard
    rankings/              Ranked shortlist and published per-vendor results
    insights/              Distributions, calibration, AI vs committee, cost comparison, themes
    api/                   File upload/download, Blob upload, AI evaluation, cron, CSV export
  lib/
    criteria.ts            Framework definition
    scoring.ts             Weighted totals, consensus, mandatory gate
    summary.ts             Per-vendor aggregation and ranking
    ai/                    Anthropic client + evaluator
    files/                 Storage (DB or Blob) and text extraction (PDF, PPTX, XLSX, DOCX, CSV)
    db/                    Drizzle schema, bootstrap SQL, demo seed
    sample/                Generated sample RFP, decks and pricing sheets
```

Branding lives in `src/lib/brand.ts`, the colour tokens in `src/app/globals.css`, and the wordmark in `src/components/brand-mark.tsx`. Replace the wordmark with the firm's logo file when it's available.

---

Confidential — Magazine Street Advisors.
