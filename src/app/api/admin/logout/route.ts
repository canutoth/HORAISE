import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "../../../../server/session";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/horaise-admin", request.url));
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
