import { NextRequest, NextResponse } from "next/server";
import {
  readMemberByEmail,
  updateMemberRow,
  readAllMembers,
  updateMemberAccess,
  approveSchedule, 
} from "../../../server/sheets";
import { 
  sendUserApproval, 
  sendAccessGrantedToUser, 
  sendScheduleApprovedToUser 
} from "../../../server/email";
import { validateScheduleHours, parseHours } from "../../../server/hoursValidation";

type AdminActions =
  | { action: "login"; email: string; password: string }
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
      case "login": {
        const adminEmail = process.env.EMAIL_ADMIN;
        const adminPassword = process.env.SENHA_ADMIN;

        if (!adminEmail || !adminPassword) {
          return NextResponse.json(
            { error: "Configuração de admin não encontrada" },
            { status: 500 }
          );
        }

        if (body.email !== adminEmail || body.password !== adminPassword) {
          return NextResponse.json(
            { error: "Email ou senha incorretos" },
            { status: 401 }
          );
        }

        return NextResponse.json({ success: true, message: "Login realizado com sucesso" });
      }

      case "read-all-members": {
        const members = await readAllMembers();
        return NextResponse.json({ members });
      }

      case "list-pending-members": {
        const allMembers = await readAllMembers();
        const pending = allMembers
          .filter((row) => {
            const pendingFlag = Number(row[5] || 0); 
            return pendingFlag === 1;
          })
          .map((row) => ({
            name: row[0] || "",
            email: row[1] || "",
            frentes: row[2] || "",
            bolsa: row[3] || "",
            editor: Number(row[4] || 0),
            pending: Number(row[5] || 0),
            hp: row[8] || "",
            ho: row[9] || "",
          }));
        return NextResponse.json({ pending });
      }

      case "approve-registration": {
        if (!body.email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
        
        const result = await updateMemberAccess(body.email, 1, 0);
        
        if (result.success) {
          const member = await readMemberByEmail(body.email);
          const name = member ? member.row[0] : "Usuário";
          sendAccessGrantedToUser(body.email, name).catch(console.error);
        }
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "approve-schedule-remove-editor": {
        if (!body.email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
        
        const result = await approveSchedule(body.email, false);

        if (result.success) {
           const member = await readMemberByEmail(body.email);
           const name = member ? member.row[0] : "Usuário";
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
        const member = {
          name: found.row[0] || "",
          email: found.row[1] || "",
          frentes: found.row[2] || "",
          bolsa: found.row[3] || "",
          editor: Number(found.row[4] || 0),
          pending: Number(found.row[5] || 0),
          hp: found.row[8] || "",
          ho: found.row[9] || "",
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
        const hp = parseHours(body.hp);
        const ho = parseHours(body.ho);
        if (hp < 0 || ho < 0) {
          return NextResponse.json(
            { error: "HP e HO devem ser >= 0" },
            { status: 400 }
          );
        }
        const memberData = {
          name: currentData.row[0] || "",
          email: body.email,
          frentes: body.frentes || currentData.row[2] || "",
          bolsa: currentData.row[3] || "",
          editor: 1, 
          pending: 0, 
          hp: body.hp,
          ho: body.ho,
        };
        const result = await updateMemberRow(memberData, false);
        if (result.success) {
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
        const hp = parseHours(member.row[8] || "0"); 
        const ho = parseHours(member.row[9] || "0"); 
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
        
        const memberName = member.row[0] || "Usuário";
        
        const updateResult = await updateMemberAccess(body.email, 1, 0);
        if (!updateResult.success) {
          return NextResponse.json(
            { error: updateResult.message },
            { status: 500 }
          );
        }
        
        try {
          await sendAccessGrantedToUser(body.email, memberName);
        } catch (emailError) {
          console.error("Erro ao enviar email para usuário:", emailError);
        }
        
        return NextResponse.json({
          success: true,
          message: `Acesso liberado para ${memberName} (${body.email})`,
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

        const memberName = currentData.row[0] || "";
        
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
        
        if (result.success) {
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
      
      const memberName = member.row[0] || "Usuário";
      
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
      
      try {
        await sendAccessGrantedToUser(email, memberName);
      } catch (emailError) {
        console.error("Erro ao enviar email para usuário:", emailError);
      }
      
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Sucesso - HORAISE</title>
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
              <h1>Acesso Liberado!</h1>
              <p><strong>${memberName}</strong> agora pode editar seus horários.</p>
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