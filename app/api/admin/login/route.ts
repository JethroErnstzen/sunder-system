import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken } from "@/lib/admin-auth";

function matchesPassword(supplied: string, configured: string) {
  const left = Buffer.from(supplied);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin sign-in is not configured on this server." }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (typeof body.password !== "string" || !matchesPassword(body.password, configuredPassword)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 400 });
  }
}