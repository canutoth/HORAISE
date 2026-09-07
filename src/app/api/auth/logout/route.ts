import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, isSafeInternalPath } from "../../../../server/session";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedRedirect = url.searchParams.get("redirect");
  const destination =
    requestedRedirect && isSafeInternalPath(requestedRedirect)
      ? requestedRedirect
      : "/scheduler";

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete(AUTH_SESSION_COOKIE);
  return response;
}