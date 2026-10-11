import { timingSafeEqual, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "or_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

const digest = (v: string) => createHash("sha256").update(v).digest();

/** Constant-time check against ADMIN_EMAIL / ADMIN_PASSWORD. */
export function checkCredentials(email: string, password: string) {
  const e = process.env.ADMIN_EMAIL, p = process.env.ADMIN_PASSWORD;
  if (!e || !p) return false;
  const okEmail = timingSafeEqual(digest(email.trim().toLowerCase()), digest(e.toLowerCase()));
  const okPass = timingSafeEqual(digest(password), digest(p));
  return okEmail && okPass;
}

export async function createSession(email: string) {
  const token = await new SignJWT({ sub: email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin" ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

/** Returns the admin email, or throws. Call at the top of every admin action. */
export async function requireAdmin() {
  const who = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!who) throw new Error("Unauthorized");
  return who;
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
