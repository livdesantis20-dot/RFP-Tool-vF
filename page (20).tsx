import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getRfp, rubricFor } from "@/lib/rfp";
import { db, users } from "@/lib/db/client";
import { blobEnabled } from "@/lib/files/storage";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RfpForm } from "./rfp-form";
import { PeopleAdmin } from "./people-admin";
import { DemoTools } from "./demo-tools";

export const dynamic = "force-dynamic";

export default async function RfpSetupPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  if (session.user.role !== "coordinator") redirect("/evaluate");
  const rfp = await getRfp();
  const rubric = rubricFor(rfp);
  const people = await db.select().from(users).orderBy(asc(users.role), asc(users.name));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <span className="kicker">Coordinator</span>
        <h1 className="font-display text-3xl mt-1">RFP setup</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Set requirements, weights and mandatory conditions before evaluation begins. The AI evaluator
          reads the issued RFP and these settings for every response; changing them marks existing AI
          evaluations as out of date.
        </p>
      </div>

      <RfpForm
        blobEnabled={blobEnabled()}
        initial={{
          clientName: rfp.clientName,
          procurementTitle: rfp.procurementTitle,
          scopeSummary: rfp.scopeSummary,
          issuedDate: rfp.issuedDate ?? "",
          responseDueDate: rfp.responseDueDate ?? "",
          rfpFile: rfp.rfpFileUrl ? { url: rfp.rfpFileUrl, name: rfp.rfpFileName ?? "RFP document" } : null,
          mandatoryRequirements: rfp.mandatoryRequirements,
          weights: Object.fromEntries(rubric.map((c) => [c.id, Math.round(c.weight * 1000) / 10])),
          aiWeightPct: Math.round(rfp.aiWeight * 100),
          shortlistSize: rfp.shortlistSize,
        }}
        criteria={rubric.map((c) => ({ id: c.id, label: c.label }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Evaluation team</CardTitle>
        </CardHeader>
        <CardBody>
          <PeopleAdmin
            currentUserId={session.user.id}
            people={people.map((p) => ({ id: p.id, name: p.name, email: p.email, title: p.title, role: p.role }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
        </CardHeader>
        <CardBody>
          <DemoTools />
        </CardBody>
      </Card>
    </div>
  );
}
