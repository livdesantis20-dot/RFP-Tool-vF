import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveLocalFile, MAX_UPLOAD_BYTES } from "@/lib/files/storage";
import { kindOf } from "@/lib/files/extract";

export const maxDuration = 60;

// Local/demo uploads (stored in the app database). Coordinator only.
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "coordinator") {
    return NextResponse.json({ error: "Coordinator only" }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
  if (kindOf(file.name, file.type) === "unknown") {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  const saved = await saveLocalFile({
    name: file.name,
    contentType: file.type || "application/octet-stream",
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  return NextResponse.json(saved);
}
