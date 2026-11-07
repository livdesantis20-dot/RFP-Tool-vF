// Standard RFP Evaluation Framework — criteria, default weights, scoring scale and
// evaluation instructions. Weights can be tailored per RFP on the RFP setup page;
// these are the defaults.

export const CRITERIA = [
  {
    id: "functionalFit",
    label: "Functional Fit",
    shortLabel: "Functional",
    weight: 0.2,
    question: "How well does the solution meet prioritized business requirements?",
    assess:
      "Required capabilities; demonstrated scenarios; configuration versus customization; workarounds and limitations.",
  },
  {
    id: "technicalFit",
    label: "Technical Fit and Integration",
    shortLabel: "Technical",
    weight: 0.1,
    question: "How well does the solution fit the technology environment?",
    assess:
      "Architecture; integrations; data migration and portability; scalability; performance; administration.",
  },
  {
    id: "securityCompliance",
    label: "Security, Privacy and Compliance",
    shortLabel: "Security",
    weight: 0.1,
    question: "How well does the solution meet applicable requirements?",
    assess:
      "Access controls; data protection; auditability; relevant certifications; regulatory requirements; exceptions.",
  },
  {
    id: "usabilityAdoption",
    label: "Usability and Adoption",
    shortLabel: "Usability",
    weight: 0.1,
    question: "How effectively can intended users complete their work?",
    assess:
      "Demonstrated workflows; navigation; accessibility; role-specific experiences; training needs; adoption effort.",
  },
  {
    id: "implementationApproach",
    label: "Implementation and Delivery Approach",
    shortLabel: "Implementation",
    weight: 0.15,
    question: "How credible and achievable is the implementation plan?",
    assess:
      "Scope; timeline; milestones; staffing; responsibilities; dependencies; testing; change management; cutover; risk mitigation.",
  },
  {
    id: "experienceTeam",
    label: "Relevant Experience and Team Capability",
    shortLabel: "Experience",
    weight: 0.1,
    question: "Can the proposed team deliver comparable work?",
    assess:
      "Comparable project scope and complexity; reference outcomes; team qualifications; availability; subcontractor responsibilities.",
  },
  {
    id: "supportService",
    label: "Support and Ongoing Service",
    shortLabel: "Support",
    weight: 0.05,
    question: "How well will the vendor support the organization after implementation?",
    assess:
      "Support coverage; service levels; escalation procedures; training; account management; release and maintenance support.",
  },
  {
    id: "totalCost",
    label: "Total Cost and Commercial Value",
    shortLabel: "Cost",
    weight: 0.15,
    question:
      "How competitive, complete and predictable is cost relative to expected benefits?",
    assess:
      "Comparable total cost over an agreed period; implementation and internal effort; recurring fees; optional charges; assumptions; renewal and exit terms.",
  },
  {
    id: "strategicFit",
    label: "Strategic Fit and Future Readiness",
    shortLabel: "Strategic",
    weight: 0.05,
    question: "How well does the solution support longer-term direction?",
    assess:
      "Target operating model and growth plans; relevant roadmap; upgrades; flexibility as needs change; vendor viability.",
  },
] as const;

export type CriterionId = (typeof CRITERIA)[number]["id"];
export const CRITERION_IDS = CRITERIA.map((c) => c.id) as CriterionId[];

export type Criterion = {
  id: CriterionId;
  label: string;
  shortLabel: string;
  weight: number;
  question: string;
  assess: string;
};

export const SCORE_SCALE = [
  {
    score: 1,
    rating: "Does not meet requirements",
    definition:
      "Substantial gaps against agreed requirements. Major changes, effort, or risk would be needed.",
  },
  {
    score: 2,
    rating: "Partially meets requirements",
    definition:
      "Some requirements met, but material gaps remain. Significant mitigation, workarounds, or investment would be needed.",
  },
  {
    score: 3,
    rating: "Meets requirements",
    definition:
      "Agreed requirements met with credible evidence. Remaining gaps are manageable through routine implementation or operations.",
  },
  {
    score: 4,
    rating: "Exceeds requirements",
    definition:
      "Requirements met with meaningful additional benefits supported by evidence and limited additional complexity or risk.",
  },
  {
    score: 5,
    rating: "Significantly exceeds requirements",
    definition:
      "Requirements met with substantial relevant advantages supported by strong evidence and a credible delivery approach.",
  },
] as const;

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

export const EVALUATION_INSTRUCTIONS = [
  {
    title: "Set requirements and weights before evaluation",
    body: "Tailor them to scope, complexity, and priorities. Keep total weight at 100%.",
  },
  {
    title: "Define mandatory requirements separately",
    body: "Identify pass/fail conditions and exception handling before reviewing proposals. A high weighted score does not override a failed mandatory requirement.",
  },
  {
    title: "Use consistent evidence",
    body: "Give vendors the same core questions, demonstration scenarios, and opportunities to clarify responses.",
  },
  {
    title: "Record the basis for each score",
    body: "Cite responses, demonstrations, references, or commercial assumptions. Distinguish current capabilities from proposed development and roadmap commitments.",
  },
  {
    title: "Resolve missing evidence",
    body: "Mark it as Not Evaluated and resolve material evidence gaps before finalizing the comparison. Do not assign an average score to missing evidence.",
  },
  {
    title: "Avoid double counting",
    body: "Score each finding under its primary criterion. Assess presentation content through the relevant criteria.",
  },
  {
    title: "Calculate the weighted total",
    body: "Sum criterion score × criterion weight, with weights expressed as decimals. Maximum score is 5.00. Multiply by 20 for a score out of 100.",
  },
] as const;

export function scaleLabel(score: number | null | undefined): string {
  if (score == null) return "Not evaluated";
  return SCORE_SCALE.find((s) => s.score === Math.round(score))?.rating ?? "";
}
