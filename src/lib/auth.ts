import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "mtt_dashboard_session";
function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET wajib diisi minimal 32 karakter.");
  return new TextEncoder().encode(secret);
}

export async function createSession() {
  return new SignJWT({ access: "dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function hasSession() {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secretKey());
    return payload.access === "dashboard";
  } catch {
    return false;
  }
}

export const sessionCookieName = COOKIE_NAME;
