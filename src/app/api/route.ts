import { NextRequest, NextResponse } from "next/server";
import {
  readMemberByEmail,
  readExample,
  updateMemberRow,
  saveScheduleRow,
  loadScheduleRow,
  readAllMembers,
  updateMemberAccess,
  approveSchedule,
} from "../../server/sheets";
import { sendAdminNotification, sendUserApproval, sendAccessRequestToAdmin, sendScheduleEditedToAdmin, sendScheduleApprovedToUser } from "../../server/email";
import { validateScheduleHours, parseHours } from "../../server/hoursValidation";
type Actions =
  | { action: "read-member"; email: string }
  | { action: "read-example" }
  | { action: "update-member"; member: { name: string; email: string; frentes: string; bolsa?: string; editor?: number | string; pending?: number | string; hp?: string; ho?: string }; isNew?: boolean }
  | { action: "save-schedule"; email: string; scheduleRow: string[] }
  | { action: "load-schedule"; email: string }
  | { action: "read-all-members" }
  | { action: "admin-precheck"; email: string }
  | { action: "admin-login"; email: string; password: string }
  | { action: "validate-hours"; scheduleRow: string[]; hp: number; ho: number }
  | { action: "request-editor-access"; email: string }
  | { action: "approve-schedule-keep-editor"; email: string }
  | { action: "approve-schedule-remove-editor"; email: string };
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
        const isNewRegistration = Boolean(body.isNew);
        const result = await updateMemberRow(body.member, Boolean(body.isNew));
        if (result.success && isNewRegistration) {
          // Envia email apenas para NOVO cadastro (notifica admin)
          sendAdminNotification(body.member.name, body.member.email).catch(e => console.error("Falha email admin:", e));
        }
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "save-schedule": {
        if (!body.email || !body.scheduleRow) return NextResponse.json({ success: false, message: "email e scheduleRow são obrigatórios" }, { status: 400 });
        // Busca dados do membro para validar
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        const editor = Number(member.row[4] || 0); // Editor é índice 4 (coluna E)
        const pending = Number(member.row[5] || 0); // Pending é índice 5 (coluna F)
        const hp = parseHours(member.row[6] || "0"); // HP é índice 6 (coluna G)
        const ho = parseHours(member.row[7] || "0"); // HO é índice 7 (coluna H)
        // Verifica se cadastro está pendente
        if (pending === 1) {
          return NextResponse.json({ 
            success: false, 
            message: "Seu cadastro está pendente de aprovação. Aguarde o administrador configurar suas horas e liberar o acesso.",
            isPending: true
          }, { status: 403 });
        }
        // Verifica se tem acesso ao editor
        if (editor !== 1) {
          return NextResponse.json({ 
            success: false, 
            message: "Você não tem permissão para editar. Solicite liberação ao administrador.",
            isBlocked: true
          }, { status: 403 });
        }
        // Se HP e HO estão configurados, valida o schedule
        if (hp > 0 && ho > 0) {
          const validation = validateScheduleHours(body.scheduleRow, hp, ho);
          if (!validation.isValid) {
            return NextResponse.json({ 
              success: false, 
              message: validation.message,
              details: validation.details 
            }, { status: 400 });
          }
        }
        const lockAfterSave = true;
        const result = await saveScheduleRow(body.email, body.scheduleRow);
        
        // Envia email ao admin notificando sobre schedule editado
        if (result.success) {
          const memberName = member.row[0] || "Usuário";
          sendScheduleEditedToAdmin(memberName, body.email).catch((e: unknown) => console.error("Falha email admin:", e));
        }
        
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
      case "validate-hours": {
        if (!body.scheduleRow || body.hp === undefined || body.ho === undefined) {
          return NextResponse.json({ isValid: false, message: "scheduleRow, hp e ho são obrigatórios" }, { status: 400 });
        }
        const validation = validateScheduleHours(body.scheduleRow, body.hp, body.ho);
        return NextResponse.json(validation);
      }
      case "request-editor-access": {
        if (!body.email) {
          return NextResponse.json({ success: false, message: "email é obrigatório" }, { status: 400 });
        }
        
        // Busca dados do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const memberName = member.row[0] || "Usuário";
        
        // Atualiza para Pending=1 (solicita acesso)
        const updateResult = await updateMemberAccess(body.email, 0, 1);
        if (!updateResult.success) {
          return NextResponse.json({ success: false, message: updateResult.message }, { status: 500 });
        }
        
        // Envia email para o admin
        try {
          await sendAccessRequestToAdmin(memberName, body.email);
        } catch (emailError) {
          console.error("Erro ao enviar email para admin:", emailError);
          // Não falha a requisição se o email não enviar
        }
        
        return NextResponse.json({ 
          success: true, 
          message: "Solicitação enviada ao administrador. Aguarde a aprovação." 
        });
      }
      case "approve-schedule-keep-editor": {
        if (!body.email) {
          return NextResponse.json({ success: false, message: "email é obrigatório" }, { status: 400 });
        }
        
        // Busca dados do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const memberName = member.row[0] || "Usuário";
        
        // Aprova mantendo editor
        const result = await approveSchedule(body.email, true);
        
        // Envia email ao usuário notificando aprovação
        if (result.success) {
          sendScheduleApprovedToUser(body.email, memberName, true).catch((e: unknown) => console.error("Falha email usuário:", e));
        }
        
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      case "approve-schedule-remove-editor": {
        if (!body.email) {
          return NextResponse.json({ success: false, message: "email é obrigatório" }, { status: 400 });
        }
        
        // Busca dados do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const memberName = member.row[0] || "Usuário";
        
        // Aprova removendo editor
        const result = await approveSchedule(body.email, false);
        
        // Envia email ao usuário notificando aprovação
        if (result.success) {
          sendScheduleApprovedToUser(body.email, memberName, false).catch((e: unknown) => console.error("Falha email usuário:", e));
        }
        
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
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
