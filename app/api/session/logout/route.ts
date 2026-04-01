import { NextResponse } from "next/server";
import { clearAuthSessionCookie } from "../../../../lib/authCookie";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthSessionCookie(response);
  return response;
}