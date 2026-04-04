import { NextResponse } from "next/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    return NextResponse.redirect(
      new URL(`/auth/confirm?code=${code}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/kitchen", request.url));
}