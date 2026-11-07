import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, AI_MODEL } from "@/lib/ai/client";

const themeSchema = z.object({
  summary: z.string().describe("2-4 sentences: the committee's collective read on this vendor."),
  strengths: z.array(z.string()).describe("Up to 5 short phrases evaluators consistently praised."),
  concerns: z.array(z.string()).describe("Up to 5 short phrases evaluators consistently flagged."),
});

export type VendorTheme = z.infer<typeof themeSchema>;

// Synthesizes all steering-committee notes on one vendor. Null when there isn't
// enough note content to say anything meaningful.
export async function summarizeVendorThemes(
  vendorName: string,
  notes: string[]
): Promise<VendorTheme | null> {
  const combined = notes
    .map((n) => n.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
  if (combined.length < 80) return null;

  const response = await anthropic().messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(themeSchema) },
    system:
      "You synthesize RFP steering-committee feedback on one vendor. You receive several evaluators' notes. Produce a fair, specific synthesis. Never quote or attribute anything to an individual evaluator. Only include patterns that appear in more than one note, or in the single note if only one exists.",
    messages: [
      {
        role: "user",
        content: `Vendor: ${vendorName}\n\nEvaluator notes (each block is one evaluator):\n\n${combined}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
