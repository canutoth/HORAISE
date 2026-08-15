import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "../../../../server/session";

export async function GET(request: NextRequest) {
  const email = getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json({ email });
}
