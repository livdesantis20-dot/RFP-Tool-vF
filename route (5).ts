import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db/client";
import { getRfp } from "@/lib/rfp";
import { loadVendorSummaries, rankVendors } from "@/lib/summary";
import { to100 } from "@/lib/scoring";

function csv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Coordinator: full scoring export. Committee: only their own scorecards
// (plus consensus once results are published).
export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const u = session.user;
  const rfp = await getRfp();
  const isCoordinator = u.role === "coordinator";
  const canSeeAll = isCoordinator || rfp.resultsPublished;
  const { rubric, vendors } = await loadVendorSummaries(rfp, canSeeAll ? {} : { onlyJudgeId: u.id });
  const { ranked } = rankVendors(vendors, rfp.shortlistSize);
  const rankMap = new Map(ranked.map((r) => [r.response.id, r.rank]));
  const nameMap = new Map(
    (await db.select({ id: users.id, name: users.name }).from(users)).map((x) => [x.id, x.name])
  );

  const header = ["vendor", ...rubric.map((c) => `${c.label} (${Math.round(c.weight * 100)}%)`), "weighted_total", "score_100"];
  const lines: string[] = [];
  if (isCoordinator) {
    lines.push(["source", ...header, "mandatory", "consensus", "rank"].map(csv).join(","));
    for (const v of vendors) {
      if (v.ai) {
        lines.push(
          ["AI evaluator", v.response.vendorName, ...rubric.map((c) => v.ai!.scores[c.id] ?? "NE"), v.ai.total ?? "incomplete", to100(v.ai.total) ?? "", v.mandatoryStatus, "", ""]
            .map(csv)
            .join(",")
        );
      }
      for (const j of v.judgeRows) {
        lines.push(
          [nameMap.get(j.judgeUserId) ?? "Evaluator",v.response.vendorName, ...rubric.map((c) => j.scores[c.id] ?? "NE"), j.result.total ?? "incomplete", to100(j.result.total) ?? "", v.mandatoryStatus, "", ""]
            .map(csv)
            .join(",")
        );
      }
      lines.push(
        ["CONSENSUS", v.response.vendorName, ...rubric.map(() => ""), "", "", v.mandatoryStatus, v.consensus ?? "", rankMap.get(v.response.id) ?? ""]
          .map(csv)
          .join(",")
      );
    }
  } else {
    lines.push([...header, ...(canSeeAll ? ["consensus", "rank"] : [])].map(csv).join(","));
    for (const v of vendors) {
      const mine = v.judgeRows.find((j) => j.judgeUserId === u.id);
      lines.push(
        [
          v.response.vendorName,
          ...rubric.map((c) => mine?.scores[c.id] ?? "NE"),
          mine?.result.total ?? "incomplete",
          to100(mine?.result.total ?? null) ?? "",
          ...(canSeeAll ? [v.consensus ?? "", rankMap.get(v.response.id) ?? ""] : []),
        ]
          .map(csv)
          .join(",")
      );
    }
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="rfp-evaluation.csv"',
    },
  });
}
