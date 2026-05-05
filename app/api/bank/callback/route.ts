import { NextRequest, NextResponse } from "next/server";

function buildProfileRedirect(request: NextRequest, message: string, mode: "success" | "error") {
  const redirectUrl = new URL("/profile", request.url);
  redirectUrl.searchParams.set("tab", "account");
  redirectUrl.searchParams.set("bank", mode);
  redirectUrl.searchParams.set("bankMessage", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  return buildProfileRedirect(
    request,
    "Plaid Link now completes inside the profile page. If you are preparing for OAuth institutions, set PLAID_REDIRECT_URI to your public profile settings URL and reopen the connection there.",
    "error",
  );
}