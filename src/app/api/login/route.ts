import { NextResponse } from "next/server";
import { createSession, sessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expected = process.env.DASHBOARD_PASSWORD;
    if (!expected) return NextResponse.json({ error: "DASHBOARD_PASSWORD belum dikonfigurasi." }, { status: 500 });
    if (typeof password !== "string" || password !== expected) {
      return NextResponse.json({ error: "Password tidak sesuai." }, { status: 401 });
    }
    const token = await createSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: 60 * 60 * 8
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }
}
