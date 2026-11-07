import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, AI_MODEL } from "@/lib/ai/client";
import { CRITERIA, SCORE_SCALE, EVALUATION_INSTRUCTIONS, type Criterion } from "@/lib/criteria";
import { extractForModel, type ExtractedDoc } from "@/lib/files/extract";
import type { LoadedFile } from "@/lib/files/storage";
import { FIRM } from "@/lib/brand";
import { round2 } from "@/lib/scoring";

const criterionResult = z.object({
  score: z
    .number()
    .nullable()
    .describe("Integer 1-5, or null for Not Evaluated when the documents contain no usable evidence."),
  rationale: z.string().describe("Basis for the score, citing specific evidence (slide/page/sheet)."),
  gaps: z.string().describe("Material gaps, risks, or missing evidence. Empty string if none."),
});

const criteriaShape = Object.fromEntries(CRITERIA.map((c) => [c.id, criterionResult])) as {
  [K in (typeof CRITERIA)[number]["id"]]: typeof criterionResult;
};

export const aiEvaluationSchema = z.object({
  overview: z.string().describe("3-4 sentence executive summary of the response and overall assessment."),
  criteria: z.object(criteriaShape),
  strengths: z.array(z.string()).describe("Top differentiators, most important first (max 5)."),
  risks: z.array(z.string()).describe("Top risks or concerns, most important first (max 5)."),
  mandatory: z
    .array(
      z.object({
        requirement: z.string().describe("The mandatory requirement, copied verbatim."),
        status: z.enum(["pass", "fail", "unclear"]),
        evidence: z.string(),
      })
    )
    .describe("One entry per mandatory requirement, in the order given."),
  pricing: z.object({
    totalCostSummary: z.string().describe("One or two sentences: total cost and what it covers."),
    estimatedTotalUsd: z
      .number()
      .nullable()
      .describe("Best estimate of total cost in USD over the term, or null if it cannot be determined."),
    termYears: z.number().nullable().describe("Term the total covers, in years, or null."),
    oneTimeCosts: z.string().describe("Implementation and other one-time costs."),
    recurringCosts: z.string().describe("Subscription, support and other recurring costs."),
    assumptions: z.array(z.string()).describe("Key pricing assumptions and exclusions."),
    concerns: z.array(z.string()).describe("Missing items, optional charges, escalators, renewal/exit risks."),
  }),
  clarificationQuestions: z
    .array(z.string())
    .describe("Questions to send the vendor to resolve material evidence gaps (max 8)."),
});

export type AiEvaluation = z.infer<typeof aiEvaluationSchema>;

export type EvaluationInput = {
  rfp: {
    clientName: string;
    procurementTitle: string;
    scopeSummary: string;
    issuedDate: string | null;
    responseDueDate: string | null;
    mandatoryRequirements: string[];
    rubric: Criterion[];
    document: LoadedFile | null;
  };
  vendor: {
    name: string;
    coordinatorNotes: string;
    response: LoadedFile;
    pricing: LoadedFile;
  };
};

const SYSTEM_PROMPT = `You are an independent RFP evaluation analyst supporting ${FIRM.name}, an advisory firm that runs vendor selections for its clients. You produce a first-read evaluation of one vendor's RFP response for the client's steering committee, who make the final decision. Your read is advisory and is one input into their consensus.

Evaluate strictly from the documents provided: the client's RFP, the vendor's response, and the vendor's required pricing sheet. Be fair, specific and evidence-based. When you cite evidence, name where it came from (for example "response p.12", "slide 7", "pricing sheet, Year 1 tab").

Scoring scale (apply identically to every vendor):
${SCORE_SCALE.map((s) => `${s.score} = ${s.rating}: ${s.definition}`).join("\n")}

A score of 3 means the vendor meets the agreed requirements. Higher scores require evidence of relevant additional value.

Evaluation rules:
${EVALUATION_INSTRUCTIONS.map((r) => `- ${r.title}. ${r.body}`).join("\n")}

Apply these rules to your output:
- Use whole-number scores. If a criterion has no usable evidence in the documents, return null (Not Evaluated) and say what is missing; never fill a gap with an average.
- Calibrate to the scale: a clear, specific statement that a requirement is met as standard (for example a named capability, certification, plan element or reference) is credible evidence for a 3. Reserve 2 for material gaps, workarounds or risks, and 1 for substantial gaps. A short response is not by itself a reason to score low; score what is there, and record what is missing as gaps and clarification questions.
- Treat marketing claims without specifics as weak evidence. Note roadmap or "future release" items as such and do not credit them as current capability.
- Judge Total Cost and Commercial Value from the pricing sheet together with the response: completeness, predictability, and value relative to scope. Flag missing line items, optional charges, escalators, and renewal or exit terms.
- Assess each mandatory requirement as pass, fail, or unclear. Use unclear when the evidence is ambiguous or absent, rather than fail.
- Do not calculate or state a weighted total, partial total, or percentage score anywhere in your text; the portal calculates totals from your criterion scores.
- Write for busy executives: plain language, no filler.`;

function docBlock(
  doc: ExtractedDoc,
  title: string
): Anthropic.ContentBlockParam {
  if (doc.mode === "pdf") {
    return {
      type: "document",
      title,
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: Buffer.from(doc.bytes).toString("base64"),
      },
    };
  }
  return {
    type: "text",
    text: `<document title="${title}" ${doc.unitLabel}="${doc.units}">\n${doc.text}\n</document>`,
  };
}

function rfpContextText(rfp: EvaluationInput["rfp"]): string {
  const crit = rfp.rubric
    .map(
      (c) =>
        `- ${c.id} — ${c.label} (weight ${Math.round(c.weight * 100)}%): ${c.question} Assess: ${c.assess}`
    )
    .join("\n");
  const mand = rfp.mandatoryRequirements.length
    ? rfp.mandatoryRequirements.map((m, i) => `${i + 1}. ${m}`).join("\n")
    : "(none defined)";
  return `RFP CONTEXT
Client: ${rfp.clientName}
Procurement: ${rfp.procurementTitle}
Issued: ${rfp.issuedDate ?? "n/a"} · Responses due: ${rfp.responseDueDate ?? "n/a"}
Facilitated by: ${FIRM.name}

Scope summary:
${rfp.scopeSummary || "(not provided)"}

Mandatory requirements (pass/fail, assessed separately from the weighted score):
${mand}

Weighted evaluation criteria (use these ids as keys):
${crit}
${rfp.document ? "\nThe client's full RFP document follows." : "\nNo RFP document was uploaded; rely on the scope summary above."}`;
}

export async function evaluateVendorResponse(
  input: EvaluationInput
): Promise<{ evaluation: AiEvaluation; scores: Record<string, number | null>; total: number | null; model: string }> {
  const { rfp, vendor } = input;

  const [rfpDoc, responseDoc, pricingDoc] = await Promise.all([
    rfp.document
      ? extractForModel(rfp.document.bytes, rfp.document.name, rfp.document.contentType)
      : Promise.resolve(null),
    extractForModel(vendor.response.bytes, vendor.response.name, vendor.response.contentType),
    extractForModel(vendor.pricing.bytes, vendor.pricing.name, vendor.pricing.contentType),
  ]);

  // Stable prefix first (RFP context + RFP document) with a cache breakpoint, so
  // evaluating several vendors in a row re-reads the RFP from cache.
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: rfpContextText(rfp) }];
  if (rfpDoc) content.push(docBlock(rfpDoc, `RFP — ${rfp.procurementTitle}`));
  const last = content[content.length - 1] as { cache_control?: { type: "ephemeral" } };
  last.cache_control = { type: "ephemeral" };

  content.push({
    type: "text",
    text: `VENDOR RESPONSE TO EVALUATE
Vendor: ${vendor.name}
${vendor.coordinatorNotes ? `Coordinator notes (context from ${FIRM.name}, not vendor evidence): ${vendor.coordinatorNotes}\n` : ""}The vendor's RFP response and required pricing sheet follow.`,
  });
  content.push(docBlock(responseDoc, `${vendor.name} — RFP response (${vendor.response.name})`));
  content.push(docBlock(pricingDoc, `${vendor.name} — Pricing sheet (${vendor.pricing.name})`));
  content.push({
    type: "text",
    text: `Evaluate ${vendor.name}'s response against every weighted criterion and every mandatory requirement above, and analyze the pricing sheet. Return the structured evaluation. In "mandatory", include exactly one entry per mandatory requirement, copying the requirement text verbatim.`,
  });

  const response = await anthropic().messages.parse(
    {
      model: AI_MODEL,
      // Haiku thinks at high effort before writing ~4-6K tokens of structured output;
      // leave generous headroom so long responses aren't cut off.
      max_tokens: 32000,
      output_config: { effort: "high", format: zodOutputFormat(aiEvaluationSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    },
    { timeout: 5 * 60 * 1000 }
  );

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to evaluate this response.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The evaluation was cut off (output limit reached). Try re-running.");
  }
  const evaluation = response.parsed_output;
  if (!evaluation) throw new Error("The model returned an evaluation that could not be parsed.");

  // Line the mandatory reads up with the RFP's exact requirement text (the model may
  // reword slightly); fall back to position when text doesn't match.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  evaluation.mandatory = rfp.mandatoryRequirements.map((req, i) => {
    const hit =
      evaluation.mandatory.find((m) => norm(m.requirement) === norm(req)) ?? evaluation.mandatory[i];
    return hit
      ? { requirement: req, status: hit.status, evidence: hit.evidence }
      : { requirement: req, status: "unclear" as const, evidence: "Not assessed by the AI." };
  });

  const scores: Record<string, number | null> = {};
  for (const c of rfp.rubric) {
    const v = evaluation.criteria[c.id]?.score;
    scores[c.id] =
      typeof v === "number" && Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) : null;
  }
  const complete = rfp.rubric.every((c) => scores[c.id] != null);
  const total = complete
    ? round2(rfp.rubric.reduce((s, c) => s + (scores[c.id] as number) * c.weight, 0))
    : null;

  console.log(
    `[ai] ${vendor.name}: total=${total ?? "incomplete"} · in=${response.usage.input_tokens} cache_read=${response.usage.cache_read_input_tokens ?? 0} out=${response.usage.output_tokens}`
  );
  return { evaluation, scores, total, model: response.model ?? AI_MODEL };
}
