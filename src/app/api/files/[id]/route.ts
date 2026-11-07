import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLocalFile } from "@/lib/files/storage";

// Serves locally stored uploads to signed-in users.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const row = await getLocalFile(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Content-Length": String(row.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(row.name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
