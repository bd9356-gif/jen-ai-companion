import { NextResponse } from "next/server";

// Pass through ?next= so /auth/confirm can land the user back on the
// URL they were originally trying to reach (e.g. /secret?import=...).
// Without this, the OAuth round-trip drops every query the user came
// in with and dumps them on /kitchen.
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  if (code) {
    const target = new URL(`/auth/confirm`, request.url);
    target.searchParams.set("code", code);
    if (next) target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL("/kitchen", request.url));
}