import { NextRequest, NextResponse } from "next/server";
import {
  readMemberByEmail,
  readExample,
  updateMemberRow,
  saveScheduleRow,
  loadScheduleRow,
  readAllMembers,
} from "../../server/sheets";

type Actions =
  | { action: "read-member"; email: string }
  | { action: "read-example" }
  | { action: "update-member"; member: { name: string; email: string; frentes: string; editor?: number | string; hp?: string; ho?: string }; isNew?: boolean }
  | { action: "save-schedule"; email: string; scheduleRow: string[] }
  | { action: "load-schedule"; email: string }
  | { action: "read-all-members" }
  | { action: "admin-precheck"; email: string }
  | { action: "admin-login"; email: string; password: string };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Actions;
    switch (body.action) {
      case "read-member": {
        if (!body.email) return NextResponse.json({ error: "email é obrigatório" }, { status: 400 });
        const found = await readMemberByEmail(body.email);
        if (!found) return NextResponse.json({ message: "not found" }, { status: 404 });
        return NextResponse.json({ member: found.row, rowNumber: found.rowNumber });
      }
      case "read-example": {
        const row = await readExample();
        if (!row) return NextResponse.json({ message: "no example row" }, { status: 404 });
        return NextResponse.json({ member: row });
      }
      case "update-member": {
        if (!body.member) return NextResponse.json({ success: false, message: "member é obrigatório" }, { status: 400 });
        const result = await updateMemberRow(body.member, Boolean(body.isNew));
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "save-schedule": {
        if (!body.email || !body.scheduleRow) return NextResponse.json({ success: false, message: "email e scheduleRow são obrigatórios" }, { status: 400 });
        const result = await saveScheduleRow(body.email, body.scheduleRow);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "load-schedule": {
        if (!body.email) return NextResponse.json({ message: "email é obrigatório" }, { status: 400 });
        const row = await loadScheduleRow(body.email);
        if (!row) return NextResponse.json({ message: "not found" }, { status: 404 });
        return NextResponse.json({ scheduleRow: row });
      }
      case "read-all-members": {
        const members = await readAllMembers();
        return NextResponse.json({ members });
      }
      case "admin-precheck": {
        if (!body.email) return NextResponse.json({ ok: false }, { status: 400 });
        const adminEmail = process.env.EMAIL_ADMIN || "";
        const isAdmin = body.email.toLowerCase() === adminEmail.toLowerCase();
        return NextResponse.json({ isAdmin });
      }
      case "admin-login": {
        const adminEmail = process.env.EMAIL_ADMIN || "";
        const adminPass = process.env.SENHA_ADMIN || "";
        if (!body.email || !body.password) {
          return NextResponse.json({ success: false, message: "email e senha obrigatórios" }, { status: 400 });
        }
        if (body.email.toLowerCase() !== adminEmail.toLowerCase()) {
          return NextResponse.json({ success: false, message: "Email não é administrador" }, { status: 403 });
        }
        if (body.password !== adminPass) {
          return NextResponse.json({ success: false, message: "Senha incorreta" }, { status: 401 });
        }
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (error) {
    console.error("/api error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
