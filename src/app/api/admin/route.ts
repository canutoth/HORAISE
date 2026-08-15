import { NextRequest, NextResponse } from "next/server";
import {
  readMemberByEmail,
  updateMemberRow,
  readAllMembers,
  updateMemberAccess,
  approveSchedule,
  deleteMemberRow,
  getColumnValue,
  readEditWindow,
  saveEditWindow,
  clearEditWindow,
  applyEditWindowState,
} from "../../../server/sheets";
import { getSessionEmail } from "../../../server/session";
import { 
  sendUserApproval, 
  sendAccessGrantedToUser, 
  sendScheduleApprovedToUser 
} from "../../../server/email";
import { validateScheduleHours, parseHours } from "../../../server/hoursValidation";

type AdminActions =
  | { action: "list-pending-members" }
  | { action: "read-all-members" } 
  | { action: "get-member"; email: string }
  | { action: "approve-registration"; email: string }
  | { action: "approve-schedule-remove-editor"; email: string }
  | { action: "revoke-editor"; email: string }
  | {
      action: "approve-member";
      email: string;
      hp: string;
      ho: string;
      frentes?: string;
    }
  | {
      action: "validate-schedule";
      email: string;
      scheduleRow: string[];
    }
  | { action: "quick-approve-access"; email: string }
  | { action: "delete-member"; email: string }
  | { action: "set-edit-window"; start: string; end: string }
  | { action: "clear-edit-window" }
  | { action: "apply-edit-window" }
  | { action: "get-edit-window" }
  | {
      action: "update-member-data";
      email: string;
      frentes: string;
      bolsa: string;
      hp: number;
      ho: number;
    };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminActions;

    switch (body.action) {
      case "read-all-members": {
        const members = await readAllMembers();
        return NextResponse.json({ members });
      }

      case "list-pending-members": {
        const allMembers = await readAllMembers();
        // Primeira linha é o cabeçalho
        if (allMembers.length === 0) {
          return NextResponse.json({ pending: [] });
        }
        
        const headerRow = allMembers[0];
        const columnMapping = new Map<string, number>();
        headerRow.forEach((col: string, idx: number) => {
          columnMapping.set(col, idx);
        });
        
        const dataRows = allMembers.slice(1); // Pula o cabeçalho
        const pending = dataRows
          .filter((row) => {
            const pendingFlag = Number(getColumnValue(row, "Pending-Access", columnMapping) || 0);
            return pendingFlag === 1;
          })
          .map((row) => ({
            name: getColumnValue(row, "Nome", columnMapping) || "",
            email: getColumnValue(row, "Email", columnMapping) || "",
            frentes: getColumnValue(row, "Frentes", columnMapping) || "",
            bolsa: getColumnValue(row, "Bolsa", columnMapping) || "",
            editor: Number(getColumnValue(row, "Editor", columnMapping) || 0),
            pending: Number(getColumnValue(row, "Pending-Access", columnMapping) || 0),
            hp: getColumnValue(row, "HP", columnMapping) || "",
            ho: getColumnValue(row, "HO", columnMapping) || "",
          }));
        return NextResponse.json({ pending });
      }

      case "approve-registration": {
        if (!body.email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
        
        const result = await updateMemberAccess(body.email, 1, 0);
        
        if (result.success && !result.alreadyDone) {
          const member = await readMemberByEmail(body.email);
          const name = member ? getColumnValue(member.row, "Nome", member.columnMapping) : "Usuário";
          sendAccessGrantedToUser(body.email, name).catch(console.error);
        }
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "approve-schedule-remove-editor": {
        if (!body.email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
        
        const result = await approveSchedule(body.email, false);

        if (result.success && !result.alreadyDone) {
           const member = await readMemberByEmail(body.email);
           const name = member ? getColumnValue(member.row, "Nome", member.columnMapping) : "Usuário";
           sendScheduleApprovedToUser(body.email, name, false).catch(console.error);
        }
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "revoke-editor": {
        if (!body.email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
        const result = await updateMemberAccess(body.email, 0, 0);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "get-member": {
        if (!body.email) {
          return NextResponse.json(
            { error: "email é obrigatório" },
            { status: 400 }
          );
        }
        const found = await readMemberByEmail(body.email);
        if (!found) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        const { row, columnMapping } = found;
        const member = {
          name: getColumnValue(row, "Nome", columnMapping),
          email: getColumnValue(row, "Email", columnMapping),
          frentes: getColumnValue(row, "Frentes", columnMapping),
          bolsa: getColumnValue(row, "Bolsa", columnMapping),
          editor: Number(getColumnValue(row, "Editor", columnMapping) || 0),
          pending: Number(getColumnValue(row, "Pending-Access", columnMapping) || 0),
          hp: getColumnValue(row, "HP", columnMapping),
          ho: getColumnValue(row, "HO", columnMapping),
        };
        return NextResponse.json({ member });
      }

      case "approve-member": {
        if (!body.email || !body.hp || !body.ho) {
          return NextResponse.json(
            { error: "email, hp e ho são obrigatórios" },
            { status: 400 }
          );
        }
        const currentData = await readMemberByEmail(body.email);
        if (!currentData) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        const { row, columnMapping } = currentData;
        const hp = parseHours(body.hp);
        const ho = parseHours(body.ho);
        if (hp < 0 || ho < 0) {
          return NextResponse.json(
            { error: "HP e HO devem ser >= 0" },
            { status: 400 }
          );
        }
        const memberData = {
          name: getColumnValue(row, "Nome", columnMapping) || "",
          email: body.email,
          frentes: body.frentes || getColumnValue(row, "Frentes", columnMapping) || "",
          bolsa: getColumnValue(row, "Bolsa", columnMapping) || "",
          editor: 1, 
          pending: 0, 
          hp: body.hp,
          ho: body.ho,
        };
        const result = await updateMemberRow(memberData, false);
        if (result.success && !result.alreadyDone) {
          sendUserApproval(body.email, memberData.name).catch((e) =>
            console.error("Falha ao enviar email:", e)
          );
        }
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }

      case "validate-schedule": {
        if (!body.email || !body.scheduleRow) {
          return NextResponse.json(
            { error: "email e scheduleRow são obrigatórios" },
            { status: 400 }
          );
        }
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        const { row, columnMapping } = member;
        const hp = parseHours(getColumnValue(row, "HP", columnMapping) || "0");
        const ho = parseHours(getColumnValue(row, "HO", columnMapping) || "0");
        if (hp === 0 && ho === 0) {
          return NextResponse.json(
            {
              error:
                "Este membro ainda não tem HP e HO configurados pelo admin",
            },
            { status: 400 }
          );
        }
        const validation = validateScheduleHours(body.scheduleRow, hp, ho);
        return NextResponse.json({
          validation,
        });
      }

      case "quick-approve-access": {
        if (!body.email) {
          return NextResponse.json(
            { error: "Email é obrigatório" },
            { status: 400 }
          );
        }
        
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        
        const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
        
        const updateResult = await updateMemberAccess(body.email, 1, 0);
        if (!updateResult.success) {
          return NextResponse.json(
            { error: updateResult.message },
            { status: 500 }
          );
        }
        
        if (!updateResult.alreadyDone) {
          try {
            await sendAccessGrantedToUser(body.email, memberName);
          } catch (emailError) {
            console.error("Erro ao enviar email para usuário:", emailError);
          }
        }
        
        return NextResponse.json({
          success: true,
          alreadyDone: updateResult.alreadyDone,
          message: updateResult.alreadyDone
            ? `Acesso para ${memberName} (${body.email}) já havia sido liberado`
            : `Acesso liberado para ${memberName} (${body.email})`,
        });
      }

      case "update-member-data": {
        if (!body.email || body.hp === undefined || body.ho === undefined) {
          return NextResponse.json(
            { error: "Email, HP e HO são obrigatórios" },
            { status: 400 }
          );
        }

        // Valida se HP e HO são >= 0
        if (body.hp < 0 || body.ho < 0) {
          return NextResponse.json(
            { error: "HP e HO devem ser maiores ou iguais a 0" },
            { status: 400 }
          );
        }

        const currentData = await readMemberByEmail(body.email);
        if (!currentData) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }

        const memberName = getColumnValue(currentData.row, "Nome", currentData.columnMapping) || "";
        
        // Atualiza os dados do membro
        const memberData = {
          name: memberName,
          email: body.email,
          frentes: body.frentes,
          bolsa: body.bolsa,
          editor: 1, // Libera acesso de editor
          pendingAccess: 0, // Remove flag de pendência
          pendingTimeTable: 0,
          hp: String(body.hp),
          ho: String(body.ho),
        };

        const result = await updateMemberRow(memberData, false);
        
        if (result.success && !result.alreadyDone) {
          // Envia email notificando que o cadastro foi aprovado
          try {
            await sendUserApproval(body.email, memberName);
          } catch (emailError) {
            console.error("Erro ao enviar email:", emailError);
          }
        }

        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }

      case "delete-member": {
        if (!body.email) {
          return NextResponse.json(
            { error: "Email é obrigatório" },
            { status: 400 }
          );
        }

        const result = await deleteMemberRow(body.email);
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }

      case "set-edit-window":
      case "clear-edit-window":
      case "apply-edit-window":
      case "get-edit-window": {
        // Ações sensíveis exigem sessão de admin válida
        const sessionEmail = getSessionEmail(request);
        if (!sessionEmail) {
          return NextResponse.json(
            { error: "Faça login como administrador" },
            { status: 401 }
          );
        }

        if (body.action === "set-edit-window") {
          if (!body.start || !body.end) {
            return NextResponse.json(
              { error: "start e end são obrigatórios" },
              { status: 400 }
            );
          }
          const startDate = new Date(body.start);
          const endDate = new Date(body.end);
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
              { error: "Datas inválidas" },
              { status: 400 }
            );
          }
          if (endDate <= startDate) {
            return NextResponse.json(
              { error: "A data de encerramento deve ser depois do início" },
              { status: 400 }
            );
          }

          const saveResult = await saveEditWindow(body.start, body.end);
          if (!saveResult.success) {
            return NextResponse.json(saveResult, { status: 400 });
          }
          const applyResult = await applyEditWindowState();
          return NextResponse.json({
            success: true,
            message: "Período de edição salvo e aplicado",
            apply: applyResult,
          });
        }

        if (body.action === "clear-edit-window") {
          await clearEditWindow();
          return NextResponse.json({
            success: true,
            message: "Período de edição removido",
          });
        }

        if (body.action === "apply-edit-window") {
          const result = await applyEditWindowState();
          return NextResponse.json(result, {
            status: result.success ? 200 : 500,
          });
        }

        // get-edit-window
        const window = await readEditWindow();
        return NextResponse.json({
          success: true,
          start: window ? window.start.toISOString() : null,
          end: window ? window.end.toISOString() : null,
        });
      }

      default:
        return NextResponse.json(
          { error: "ação inválida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Erro na API admin:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const email = searchParams.get("email");
    
    if (action === "quick-approve-access" && email) {
      const member = await readMemberByEmail(email);
      if (!member) {
        return new NextResponse(
          `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Erro - HORAISE</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #f8f9ff;
                }
                .message-box {
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 500px;
                }
                .icon { font-size: 48px; margin-bottom: 20px; }
                .error { color: #dc3545; }
                h1 { color: #0E1862; margin-bottom: 10px; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="message-box">
                <div class="icon error">❌</div>
                <h1>Erro</h1>
                <p>Membro não encontrado: ${email}</p>
              </div>
            </body>
          </html>
          `,
          {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }
      
      const memberName = getColumnValue(member.row, "Nome", member.columnMapping) || "Usuário";
      
      const updateResult = await updateMemberAccess(email, 1, 0);
      if (!updateResult.success) {
        return new NextResponse(
          `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Erro - HORAISE</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #f8f9ff;
                }
                .message-box {
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 500px;
                }
                .icon { font-size: 48px; margin-bottom: 20px; }
                .error { color: #dc3545; }
                h1 { color: #0E1862; margin-bottom: 10px; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="message-box">
                <div class="icon error">❌</div>
                <h1>Erro</h1>
                <p>${updateResult.message}</p>
              </div>
            </body>
          </html>
          `,
          {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }
      
      if (!updateResult.alreadyDone) {
        try {
          await sendAccessGrantedToUser(email, memberName);
        } catch (emailError) {
          console.error("Erro ao enviar email para usuário:", emailError);
        }
      }
      
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${updateResult.alreadyDone ? "Aviso - HORAISE" : "Sucesso - HORAISE"}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f8f9ff;
              }
              .message-box {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              .icon { font-size: 48px; margin-bottom: 20px; }
              .success { color: #28a745; }
              h1 { color: #0E1862; margin-bottom: 10px; }
              p { color: #666; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="message-box">
              <div class="icon success">✅</div>
              <h1>${updateResult.alreadyDone ? "Acesso Já Liberado!" : "Acesso Liberado!"}</h1>
              <p><strong>${memberName}</strong> ${updateResult.alreadyDone ? "já tinha acesso de edição — nada foi alterado." : "agora pode editar seus horários."}</p>
              <p style="margin-top: 20px; font-size: 14px; color: #999;">Você pode fechar esta aba.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Erro - HORAISE</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f8f9ff;
            }
            .message-box {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            .icon { font-size: 48px; margin-bottom: 20px; }
            .error { color: #dc3545; }
            h1 { color: #0E1862; margin-bottom: 10px; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="message-box">
            <div class="icon error">❌</div>
            <h1>Erro</h1>
            <p>Ação inválida</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Erro no GET /api/admin:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Erro - HORAISE</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f8f9ff;
            }
            .message-box {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            .icon { font-size: 48px; margin-bottom: 20px; }
            .error { color: #dc3545; }
            h1 { color: #0E1862; margin-bottom: 10px; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="message-box">
            <div class="icon error">❌</div>
            <h1>Erro</h1>
            <p>Erro interno do servidor</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}