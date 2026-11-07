// The guided demo tour. Pure data — shared by the /demo page, the step routes and the
// banner. `as` is the demo person the step signs you in as (null = keep current session).
// `target` is where the step lands; "vendor:<name>" resolves to that vendor's page.

export type DemoStep = {
  title: string;
  as: string | null;
  asLabel?: string;
  target: string;
  banner: string; // one-line instruction shown at the top of every page during the step
  bannerIfUnpublished?: string; // used instead when results haven't been published yet
  detail: string[]; // fuller explanation on the /demo page
};

export const DEMO_STEPS: DemoStep[] = [
  {
    title: "The evaluation framework",
    as: null,
    target: "/criteria",
    banner:
      "Every response is scored against these nine weighted criteria on a 1–5 scale, plus pass/fail mandatory requirements. Skim it, then click Next.",
    detail: [
      "Nine weighted criteria (Functional Fit 20%, Implementation 15%, Total Cost 15%, …) and a five-point scale where 3 means “meets requirements”.",
      "Mandatory requirements are pass/fail and separate: a vendor that fails one can't be shortlisted, however well it scores.",
    ],
  },
  {
    title: "The coordinator's dashboard",
    as: "u-coord-1",
    asLabel: "Avery Thompson, Engagement Director at Magazine Street Advisors",
    target: "/evaluate",
    banner:
      "You're Avery, the MSA coordinator. Three firms responded. Look at the AI scores, the Mandatory column (Cypress Ridge fails) and how many committee scorecards are in.",
    detail: [
      "Coordinators run the RFP: they upload each firm's response and pricing sheet, run the AI evaluator and track the committee's progress.",
      "Notice Cypress Ridge is flagged as failing a mandatory requirement, and three of the four committee members have already scored.",
    ],
  },
  {
    title: "Inside an AI evaluation",
    as: "u-coord-1",
    asLabel: "Avery Thompson",
    target: "vendor:Northline Cloud ERP",
    banner:
      "This is the AI's first read of Northline: a score and cited evidence per criterion, risks, a pricing analysis and clarification questions. Scroll down. It spotted that the deck's total doesn't match the pricing sheet.",
    detail: [
      "The AI reads the issued RFP, the vendor's deck and its pricing sheet, then scores every criterion with evidence and gaps.",
      "It checks each mandatory requirement, analyzes the pricing sheet, and drafts clarification questions to send the vendor.",
      "Its score is advisory: it counts for 5% of the consensus, and committee members can't see it until results are published.",
    ],
  },
  {
    title: "Upload a new response",
    as: "u-coord-1",
    asLabel: "Avery Thompson",
    target: "/evaluate/upload",
    banner:
      "Try it yourself: download Lakeshore's sample deck and pricing sheet from the box below, upload both, then save. The AI evaluates it in about a minute.",
    detail: [
      "Every participating firm submits two files: its response deck and the required pricing sheet.",
      "A late fourth bidder, Lakeshore Business Systems, has sample files you can download and upload. The AI evaluation runs automatically.",
    ],
  },
  {
    title: "Score as a committee member",
    as: "u-judge-2",
    asLabel: "Raj Patel, CIO on the client's steering committee",
    target: "/evaluate",
    banner:
      "You're now Raj Patel, the client's CIO. Open a vendor and score it from 1 to 5 on each criterion. You can't see the AI or other evaluators, which keeps scoring independent.",
    detail: [
      "Steering committee members score each response on their own, with a note on the basis for each score.",
      "They can't see the AI evaluation or anyone else's scores until the coordinator publishes results, so nobody anchors anyone else.",
    ],
  },
  {
    title: "Rankings and insights",
    as: "u-coord-1",
    asLabel: "Avery Thompson",
    target: "/rankings",
    banner:
      "Back as Avery: here's the live consensus ranking and recommended shortlist. Cypress Ridge can't be shortlisted. Then open Insights in the menu for cost comparison and evaluator calibration.",
    detail: [
      "Consensus is 95% the committee's average and 5% the AI evaluator. Vendors with a failed mandatory requirement drop out of the shortlist automatically.",
      "Insights show cost side by side, where evaluators disagree, how the AI compares with the committee, and a summary of the committee's notes on each vendor.",
    ],
  },
  {
    title: "Publish the results",
    as: "u-coord-1",
    asLabel: "Avery Thompson",
    target: "/evaluate",
    banner:
      "When the committee is done, the coordinator publishes. Click “Results: Hidden” at the top right of this page to publish to the committee, then click Next.",
    detail: ["Publishing releases rankings, anonymized scorecards, the AI evaluations and insights to the steering committee."],
  },
  {
    title: "What the committee sees",
    as: "u-judge-2",
    asLabel: "Raj Patel",
    target: "/rankings",
    banner:
      "You're Raj again. With results published, he sees the ranking and shortlist. Open a vendor to see anonymized scorecards and the AI's read. That's the tour!",
    bannerIfUnpublished:
      "You're Raj again, but results aren't published yet, so the ranking is still hidden from him. Click Back, publish with “Results: Hidden”, then click Next to return here.",
    detail: [
      "After publishing, committee members see the consensus, every scorecard (anonymized as Evaluator #1, #2, …), the AI evaluation and the insights.",
    ],
  },
];

export const STEP_COOKIE = "msa_demo_step";
