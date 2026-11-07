// Pre-filled steering-committee scorecards for the demo starting point. Raj Patel (CIO)
// is deliberately left blank so the person taking the demo can score as him.
// Criterion order: functionalFit, technicalFit, securityCompliance, usabilityAdoption,
// implementationApproach, experienceTeam, supportService, totalCost, strategicFit.

const IDS = [
  "functionalFit",
  "technicalFit",
  "securityCompliance",
  "usabilityAdoption",
  "implementationApproach",
  "experienceTeam",
  "supportService",
  "totalCost",
  "strategicFit",
] as const;

type Card = { scores: number[]; criterionNotes?: Partial<Record<(typeof IDS)[number], string>>; notes: string };

export const SAMPLE_SCORECARDS: Record<string, Record<string, Card>> = {
  "u-judge-1": {
    "Northline Cloud ERP": {
      scores: [4, 4, 4, 3, 4, 4, 4, 3, 4],
      criterionNotes: {
        functionalFit: "Strongest out-of-the-box finance and consolidation coverage of the three.",
        totalCost: "Highest 5-year cost. Deck says $6.84M but the pricing sheet adds to $6.52M — needs clarifying.",
      },
      notes:
        "Strongest functional coverage and finance capabilities; fixed-fee phases give cost certainty. Highest price, and the total in the deck doesn't match the pricing sheet. Finite scheduling is an extra.",
    },
    "Harbor & Vine Digital": {
      scores: [4, 3, 4, 4, 5, 4, 3, 4, 4],
      criterionNotes: {
        implementationApproach: "Parallel close plus two cutover rehearsals per phase, 100% onshore — the most credible plan.",
        supportService: "Only 12x5 support unless we pay the 24x7 uplift.",
      },
      notes:
        "Most credible delivery plan with a strong change-management workstream. Mid-range price with fixed fees. Support coverage is thinner unless we pay for 24x7.",
    },
    "Cypress Ridge Systems": {
      scores: [2, 2, 2, 3, 2, 2, 3, 4, 2],
      criterionNotes: {
        totalCost: "Cheapest on paper, but implementation is time-and-materials so the number is soft.",
        securityCompliance: "SOC 1 Type II not available until 2027.",
      },
      notes:
        "Cheapest by far, but the T&M implementation makes the number unreliable. SOC 1 Type II isn't available until 2027, which fails a mandatory requirement, and no implementation lead is named.",
    },
  },
  "u-judge-3": {
    "Northline Cloud ERP": {
      scores: [4, 4, 4, 4, 4, 4, 4, 3, 4],
      criterionNotes: {
        usabilityAdoption: "Mobile scanning that works offline suits our warehouses.",
      },
      notes:
        "Mobile scanning and offline mode fit the warehouses well. The implementation plan is credible with three test cycles. The configurator needs 6–8 weeks of product modeling.",
    },
    "Harbor & Vine Digital": {
      scores: [4, 4, 4, 5, 5, 5, 3, 4, 4],
      criterionNotes: {
        usabilityAdoption: "Day-in-the-life prototypes in month 2 and floor support after go-live are what the plants need.",
        experienceTeam: "They've already built four pump and valve configurators.",
      },
      notes:
        "Adopt-First prototypes and floor support after go-live are exactly what the plants need, and the pump configurator accelerator is a real plus. Data migration approach wasn't described.",
    },
    "Cypress Ridge Systems": {
      scores: [2, 2, 2, 2, 2, 2, 2, 3, 2],
      criterionNotes: {
        implementationApproach: "A single go-live across all four plants and both DCs is too risky.",
      },
      notes:
        "A single big-bang go-live across every plant is too risky. Serial tracking and the configurator need customization, and the shop-floor add-on isn't included in the price.",
    },
  },
  "u-judge-4": {
    "Northline Cloud ERP": {
      scores: [5, 4, 5, 3, 4, 4, 4, 2, 4],
      criterionNotes: {
        functionalFit: "Best close and consolidation story; references are closing in 4.5 days.",
        totalCost: "Highest price and the escalator compounds — push on year 6–7 renewal terms.",
      },
      notes:
        "Best close and consolidation story, with references closing in 4.5 days. SOC reports and the segregation-of-duties library are strong. Price is the highest and the escalator compounds.",
    },
    "Harbor & Vine Digital": {
      scores: [4, 3, 4, 4, 4, 4, 3, 4, 3],
      criterionNotes: {
        strategicFit: "Licensing through the integrator adds dependency; we need renewal and exit terms.",
      },
      notes:
        "Good value with fixed fees, but licensing the platform through the integrator adds dependency and we need renewal and exit terms. Data migration plan is missing.",
    },
    "Cypress Ridge Systems": {
      scores: [2, 2, 1, 3, 2, 2, 3, 3, 2],
      criterionNotes: {
        securityCompliance: "No SOC 1 Type II — a problem for our external audit.",
        totalCost: "7% escalator after year 2 erodes the price advantage.",
      },
      notes:
        "Fails our SOC 1 requirement, which matters for the external audit. The 7% escalator after year 2 erodes most of the price advantage.",
    },
  },
};

export function toScoreMap(scores: number[]): Record<string, number> {
  return Object.fromEntries(IDS.map((id, i) => [id, scores[i]]));
}
