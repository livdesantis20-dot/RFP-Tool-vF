import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db, ensureDb, users, type Role } from "@/lib/db/client";

// Demo sign-in: no SSO. A user picks who they are on /signin and we set a signed,
// httpOnly cookie with their user id. Optionally gated by DEMO_ACCESS_CODE.

const COOKIE = "msa_session";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    console.warn("[auth] AUTH_SECRET is not set — using an insecure default.");
  }
  return s || "msa-local-demo-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  organization: string | null;
  role: Role;
};

export const auth = cache(async (): Promise<{ user: SessionUser } | null> => {
  await ensureDb();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const uid = verify(token);
  if (!uid) return null;
  const [row] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!row) return null;
  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      title: row.title,
      organization: row.organization,
      role: row.role,
    },
  };
});

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
});

export function sessionCookie(userId: string) {
  return { name: COOKIE, value: `${userId}.${sign(userId)}`, options: cookieOpts() };
}

// Only callable from Server Actions / Route Handlers (cookie writes).
export async function setSession(userId: string) {
  const c = sessionCookie(userId);
  (await cookies()).set(c.name, c.value, c.options);
}

// DEMO_ACCESS_CODE is entered once; a signed cookie remembers it.
const ACCESS_COOKIE = "msa_access";

export async function hasDemoAccess(): Promise<boolean> {
  if (!process.env.DEMO_ACCESS_CODE) return true;
  const t = (await cookies()).get(ACCESS_COOKIE)?.value;
  return !!t && verify(t) === "ok";
}

export async function grantDemoAccess() {
  (await cookies()).set(ACCESS_COOKIE, `ok.${sign("ok")}`, { ...cookieOpts(), maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const s = await auth();
  if (!s) throw new Error("Unauthorized");
  return s.user;
}

export async function requireCoordinator(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "coordinator") throw new Error("Forbidden — coordinator only");
  return u;
}

export async function requireJudge(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "judge") throw new Error("Forbidden — steering committee only");
  return u;
}

export function demoAccessCodeRequired(): boolean {
  return !!process.env.DEMO_ACCESS_CODE;
}

export function checkDemoAccessCode(code: string): boolean {
  const expected = process.env.DEMO_ACCESS_CODE;
  if (!expected) return true;
  const a = Buffer.from(code.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const ROLE_LABEL: Record<Role, string> = {
  coordinator: "RFP Coordinator",
  judge: "Steering Committee",
};
