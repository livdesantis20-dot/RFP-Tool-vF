import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db/client";

// Files live either in Vercel Blob (when BLOB_READ_WRITE_TOKEN is set — needed on
// Vercel because serverless request bodies are capped at ~4.5 MB) or in the app's
// own database (local dev / demo). URLs:
//   local → /api/files/<id>
//   blob  → https://…blob.vercel-storage.com/…

export const LOCAL_PREFIX = "/api/files/";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function blobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function saveLocalFile(input: {
  name: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<{ url: string; name: string; size: number; contentType: string }> {
  const id = randomUUID();
  await db.insert(files).values({
    id,
    name: input.name,
    contentType: input.contentType || "application/octet-stream",
    size: input.bytes.byteLength,
    data: input.bytes,
  });
  return {
    url: `${LOCAL_PREFIX}${id}`,
    name: input.name,
    size: input.bytes.byteLength,
    contentType: input.contentType,
  };
}

export async function getLocalFile(id: string) {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return row ?? null;
}

export type LoadedFile = { bytes: Uint8Array; contentType: string; name: string };

export async function loadFile(url: string, fallbackName = "file"): Promise<LoadedFile> {
  if (url.startsWith(LOCAL_PREFIX)) {
    const row = await getLocalFile(url.slice(LOCAL_PREFIX.length));
    if (!row) throw new Error(`File not found: ${url}`);
    return { bytes: new Uint8Array(row.data), contentType: row.contentType, name: row.name };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download file (${res.status})`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    name: decodeURIComponent(url.split("/").pop() ?? fallbackName),
  };
}

export function isAllowedUrl(url: string): boolean {
  if (url.startsWith(LOCAL_PREFIX)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
