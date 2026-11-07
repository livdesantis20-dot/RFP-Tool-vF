import { DEMO_MODE } from "@/lib/demo";
import { uploadVendorFile } from "@/lib/sample/load";

// Sample files from a fictional fourth bidder, for trying the upload flow in the demo.
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  if (!DEMO_MODE) return new Response("Not found", { status: 404 });
  const { kind } = await ctx.params;
  if (kind !== "response" && kind !== "pricing") return new Response("Not found", { status: 404 });
  const f = await uploadVendorFile(kind);
  return new Response(Buffer.from(f.bytes), {
    headers: {
      "Content-Type": f.contentType,
      "Content-Disposition": `attachment; filename="${f.name}"`,
      "Cache-Control": "no-store",
    },
  });
}
