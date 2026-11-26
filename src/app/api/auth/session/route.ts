import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "../../../../server/session";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json(session);
}