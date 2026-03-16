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
  readBacklogOptions,
  readRulesFromSheet,
  loadSuggestedSchedule,
  acceptSuggestedSchedule,
  getColumnValue,
} from "../../server/sheets";
import { sendAdminNotification, sendUserApproval, sendAccessRequestToAdmin, sendScheduleEditedToAdmin, sendScheduleApprovedToUser } from "../../server/email";
import { validateScheduleHours, parseHours } from "../../server/hoursValidation";
import { validateDynamicRules } from "../../server/dynamicRulesValidation";
type Actions =
  | { action: "read-member"; email: string }
  | { action: "read-example" }
  | { action: "update-member"; member: { name: string; email: string; frentes: string; bolsa?: string; editor?: number | string; pending?: number | string; hp?: string; ho?: string }; isNew?: boolean }
  | { action: "update-member-metadata"; email: string; hp?: string; ho?: string }
  | { action: "save-schedule"; email: string; scheduleRow: string[]; isAdmin?: boolean }
  | { action: "load-schedule"; email: string }
  | { action: "save-suggested-schedule"; adminEmail: string; targetEmail: string; scheduleRow: string[] }
  | { action: "load-suggested-schedule"; email: string }
  | { action: "accept-suggested-schedule"; email: string }
  | { action: "read-all-members" }
  | { action: "read-backlog-options" }
  | { action: "read-rules" }
  | { action: "admin-precheck"; email: string }
  | { action: "admin-login"; email: string; password: string }
  | { action: "validate-hours"; scheduleRow: string[]; hp: number; ho: number }
  | { action: "validate-dynamic-rules"; scheduleRow: string[] }
  | { action: "request-editor-access"; email: string }
  | { action: "request-schedule-exception"; email: string; schedule: any; violations: string[] }
  | { action: "approve-schedule-keep-editor"; email: string }
  | { action: "approve-schedule-remove-editor"; email: string }
  | { action: "notify-profile-change"; userEmail: string; userName: string; field: string; oldValue: string; newValue: string };
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Actions;
    switch (body.action) {
      case "read-member": {
        if (!body.email) return NextResponse.json({ error: "email é obrigatório" }, { status: 400 });
        const found = await readMemberByEmail(body.email);
        if (!found) return NextResponse.json({ message: "not found" }, { status: 404 });
        // Converte Map para objeto para serialização JSON
        const columnMapping = Object.fromEntries(found.columnMapping);
        return NextResponse.json({ member: found.row, rowNumber: found.rowNumber, columnMapping });
      }
      case "read-example": {
        const result = await readExample();
        if (!result) return NextResponse.json({ message: "no example row" }, { status: 404 });
        // Converte Map para objeto para serialização JSON
        const columnMapping = Object.fromEntries(result.columnMapping);
        return NextResponse.json({ member: result.row, columnMapping });
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
      case "update-member-metadata": {
        if (!body.email) {
          return NextResponse.json({ success: false, message: "Email é obrigatório" }, { status: 400 });
        }
        
        // Busca membro existente
        const existingMember = await readMemberByEmail(body.email);
        if (!existingMember) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const { row, columnMapping } = existingMember;
        
        // Atualiza apenas HP e/ou HO sem validar schedule
        const updatedMember = {
          name: getColumnValue(row, "Nome", columnMapping),
          email: getColumnValue(row, "Email", columnMapping),
          frentes: getColumnValue(row, "Frentes", columnMapping),
          bolsa: getColumnValue(row, "Bolsa", columnMapping),
          editor: getColumnValue(row, "Editor", columnMapping),
          pending: getColumnValue(row, "Pending-Access", columnMapping),
          hp: body.hp !== undefined ? body.hp : getColumnValue(row, "HP", columnMapping),
          ho: body.ho !== undefined ? body.ho : getColumnValue(row, "HO", columnMapping),
        };
        
        const result = await updateMemberRow(updatedMember, false);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "save-schedule": {
        if (!body.email || !body.scheduleRow) return NextResponse.json({ success: false, message: "email e scheduleRow são obrigatórios" }, { status: 400 });
        
        const isAdmin = body.isAdmin === true;
        
        // Busca dados do membro para validar
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const { row, columnMapping } = member;
        
        const editor = Number(getColumnValue(row, "Editor", columnMapping) || 0);
        const pending = Number(getColumnValue(row, "Pending-Access", columnMapping) || 0);
        const hp = parseHours(getColumnValue(row, "HP", columnMapping) || "0");
        const ho = parseHours(getColumnValue(row, "HO", columnMapping) || "0");
        
        // Admin bypassa todas as validações
        if (!isAdmin) {
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
          
          // Busca e valida regras dinâmicas da aba RULES
          try {
            const rules = await readRulesFromSheet();
            const dynamicValidation = validateDynamicRules(body.scheduleRow, rules);
            
            if (!dynamicValidation.isValid) {
              return NextResponse.json({
                success: false,
                message: "Seu horário viola as seguintes regras:\n" + dynamicValidation.errors.join("\n"),
                errors: dynamicValidation.errors,
              }, { status: 400 });
            }
          } catch (rulesError) {
            console.error("Erro ao validar regras dinâmicas:", rulesError);
            // Continua sem validação dinâmica se houver erro
          }
        }
        
        const lockAfterSave = true;
        const result = await saveScheduleRow(body.email, body.scheduleRow);
        
        // Envia email ao admin notificando sobre schedule editado
        if (result.success) {
          const memberName = getColumnValue(row, "Nome", columnMapping) || "Usuário";
          sendScheduleEditedToAdmin(memberName, body.email).catch((e: unknown) => console.error("Falha email admin:", e));
        }
        
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "load-schedule": {
        if (!body.email) return NextResponse.json({ message: "email é obrigatório" }, { status: 400 });
        const row = await loadScheduleRow(body.email);
        if (!row || row.length === 0) return NextResponse.json({ message: "not found" }, { status: 404 });
        return NextResponse.json({ scheduleRow: row });
      }
      case "save-suggested-schedule": {
        if (!body.adminEmail || !body.targetEmail || !body.scheduleRow) {
          return NextResponse.json({ success: false, message: "adminEmail, targetEmail e scheduleRow são obrigatórios" }, { status: 400 });
        }
        
        // Verifica se o adminEmail é realmente admin
        const adminEmailEnv = process.env.EMAIL_ADMIN || "";
        if (body.adminEmail.toLowerCase() !== adminEmailEnv.toLowerCase()) {
          return NextResponse.json({ success: false, message: "Apenas administradores podem definir horários" }, { status: 403 });
        }
        
        // Busca dados do membro alvo
        const targetMember = await readMemberByEmail(body.targetEmail);
        if (!targetMember) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const targetName = getColumnValue(targetMember.row, "Nome", targetMember.columnMapping) || "Usuário";
        
        // Salva o schedule diretamente na aba principal e remove pendência de horário.
        const result = await saveScheduleRow(body.targetEmail, body.scheduleRow, false);
        
        if (result.success) {
          // Quando o admin define o horário, o usuário não deve permanecer com acesso de edição.
          const accessUpdate = await updateMemberAccess(body.targetEmail, 0, 0);
          if (!accessUpdate.success) {
            console.error("Falha ao remover acesso de edição após definir horário:", accessUpdate.message);
            return NextResponse.json(
              {
                success: false,
                message: "Horário salvo, mas não foi possível remover o acesso de edição automaticamente.",
              },
              { status: 500 }
            );
          }

          const { sendSuggestionToUser } = await import("../../server/email");

          // Aguarda o envio para não perder a task ao encerrar a rota.
          console.log(`📧 Enviando email de horário definido para ${body.targetEmail}...`);
          try {
            await sendSuggestionToUser(body.targetEmail, targetName);
            console.log(`✅ Email enviado com sucesso para ${body.targetEmail}`);
          } catch (e: unknown) {
            console.error("❌ Falha ao enviar email:", e);
            return NextResponse.json(
              {
                success: false,
                message: "Horário salvo, mas não foi possível enviar o email ao usuário.",
              },
              { status: 500 }
            );
          }
        }
        
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "load-suggested-schedule": {
        if (!body.email) return NextResponse.json({ message: "email é obrigatório" }, { status: 400 });
        const row = await loadSuggestedSchedule(body.email);
        if (!row) return NextResponse.json({ message: "not found" }, { status: 404 });
        return NextResponse.json({ scheduleRow: row });
      }
      case "accept-suggested-schedule": {
        if (!body.email) {
          return NextResponse.json({ success: false, message: "email é obrigatório" }, { status: 400 });
        }
        
        const result = await acceptSuggestedSchedule(body.email);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case "read-all-members": {
        const members = await readAllMembers();
        return NextResponse.json({ members });
      }
      case "read-backlog-options": {
        try {
          const options = await readBacklogOptions();
          return NextResponse.json({ frentes: options.frentes, bolsas: options.bolsas });
        } catch (error) {
          console.error("Erro ao ler backlog options:", error);
          return NextResponse.json({ frentes: [], bolsas: [] }, { status: 500 });
        }
      }
      case "read-rules": {
        try {
          const rules = await readRulesFromSheet();
          return NextResponse.json({ success: true, rules });
        } catch (error) {
          console.error("Erro ao buscar regras:", error);
          return NextResponse.json({ success: false, message: "Erro ao buscar regras" }, { status: 500 });
        }
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
      case "validate-dynamic-rules": {
        if (!body.scheduleRow) {
          return NextResponse.json({ isValid: false, message: "scheduleRow é obrigatório" }, { status: 400 });
        }
        
        try {
          const rules = await readRulesFromSheet();
          const dynamicValidation = validateDynamicRules(body.scheduleRow, rules);
          
          return NextResponse.json({
            isValid: dynamicValidation.isValid,
            errors: dynamicValidation.errors
          });
        } catch (error) {
          console.error("Erro ao validar regras dinâmicas:", error);
          return NextResponse.json({ 
            isValid: true, 
            errors: [] 
          }); // Retorna válido se houver erro para não bloquear
        }
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
        
        const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
        
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
      case "request-schedule-exception": {
        if (!body.email || !body.schedule || !body.violations) {
          return NextResponse.json({ success: false, message: "email, schedule e violations são obrigatórios" }, { status: 400 });
        }
        
        // Busca dados do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json({ success: false, message: "Membro não encontrado" }, { status: 404 });
        }
        
        const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
        
        // Salva o schedule e marca como pendente de aprovação (Pending-Suggestion = 1 para exceção)
        try {
          // Importa a função de conversão do schedule
          const { scheduleToInfoRow } = await import("../../services/googleSheets");
          const scheduleRow = scheduleToInfoRow(body.schedule);
          
          // Salva como exceção (Pending-Suggestion = 1)
          const { saveScheduleRowAsException } = await import("../../server/sheets");
          const saveResult = await saveScheduleRowAsException(body.email, scheduleRow);
          
          if (!saveResult.success) {
            return NextResponse.json({ success: false, message: saveResult.message }, { status: 500 });
          }
          
          // Envia email ao admin notificando sobre a exceção solicitada
          const { sendExceptionRequestToAdmin } = await import("../../server/email");
          await sendExceptionRequestToAdmin(memberName, body.email, body.violations);
          
          return NextResponse.json({ 
            success: true, 
            message: "Solicitação de exceção enviada ao administrador." 
          });
        } catch (error) {
          console.error("Erro ao processar solicitação de exceção:", error);
          return NextResponse.json({ 
            success: false, 
            message: "Erro ao processar solicitação" 
          }, { status: 500 });
        }
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
        
        const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
        
        // Aprova mantendo editor
        const result = await approveSchedule(body.email, true);
        
        // Envia email ao usuário notificando aprovação (usa email de exceção aprovada)
        if (result.success) {
          const { sendExceptionApprovedToUser } = await import("../../server/email");
          sendExceptionApprovedToUser(body.email, memberName).catch((e: unknown) => console.error("Falha email usuário:", e));
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
        
        const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
        
        // Aprova removendo editor
        const result = await approveSchedule(body.email, false);
        
        // Envia email ao usuário notificando aprovação (usa email de exceção aprovada)
        if (result.success) {
          const { sendExceptionApprovedToUser } = await import("../../server/email");
          sendExceptionApprovedToUser(body.email, memberName).catch((e: unknown) => console.error("Falha email usuário:", e));
        }
        
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      case "notify-profile-change": {
        if (!body.userEmail || !body.userName || !body.field || !body.oldValue || !body.newValue) {
          return NextResponse.json({ success: false, message: "Dados incompletos" }, { status: 400 });
        }
        
        try {
          const { sendProfileChangeToUser } = await import("../../server/email");
          await sendProfileChangeToUser(body.userEmail, body.userName, body.field, body.oldValue, body.newValue);
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error("Erro ao enviar email de mudança de perfil:", error);
          return NextResponse.json({ success: false, message: "Erro ao enviar email" }, { status: 500 });
        }
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
