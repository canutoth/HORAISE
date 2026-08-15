import { NextRequest, NextResponse } from "next/server";
import { applyEditWindowState } from "../../../../server/sheets";

/**
 * Rota chamada pelo cron do Vercel (vercel.json) para abrir/fechar
 * a janela de edição automaticamente conforme as datas configuradas.
 * Protegida por CRON_SECRET (header Authorization: Bearer).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await applyEditWindowState();
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Erro no cron apply-edit-window:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
