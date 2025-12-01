import { NextRequest, NextResponse } from "next/server";
import {
  readMemberByEmail,
  updateMemberRow,
  readAllMembers,
  updateMemberAccess,
} from "../../../server/sheets";
import { sendUserApproval, sendAccessGrantedToUser } from "../../../server/email";
import { validateScheduleHours, parseHours } from "../../../server/hoursValidation";
type AdminActions =
  | { action: "list-pending-members" }
  | { action: "get-member"; email: string }
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
  | { action: "quick-approve-access"; email: string };
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminActions;
    switch (body.action) {
      case "list-pending-members": {
        // Lista todos os membros com Pending = 1 (pendentes de aprovação)
        const allMembers = await readAllMembers();
        const pending = allMembers
          .filter((row) => {
            const pendingFlag = Number(row[5] || 0); // Coluna F (Pending)
            return pendingFlag === 1;
          })
          .map((row) => ({
            name: row[0] || "",
            email: row[1] || "",
            frentes: row[2] || "",
            bolsa: row[3] || "",
            editor: Number(row[4] || 0),
            pending: Number(row[5] || 0),
            hp: row[6] || "",
            ho: row[7] || "",
          }));
        return NextResponse.json({ pending });
      }
      case "get-member": {
        // Busca informações completas de um membro específico
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
          hp: found.row[6] || "",
          ho: found.row[7] || "",
        };
        return NextResponse.json({ member });
      }
      case "approve-member": {
        // Admin aprova um cadastro: define HP, HO, libera Editor (=1) e zera Pending (=0)
        if (!body.email || !body.hp || !body.ho) {
          return NextResponse.json(
            { error: "email, hp e ho são obrigatórios" },
            { status: 400 }
          );
        }
        // Busca dados atuais do membro
        const currentData = await readMemberByEmail(body.email);
        if (!currentData) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        // Valida HP e HO
        const hp = parseHours(body.hp);
        const ho = parseHours(body.ho);
        if (hp < 0 || ho < 0) {
          return NextResponse.json(
            { error: "HP e HO devem ser >= 0" },
            { status: 400 }
          );
        }
        // Atualiza com os dados do admin
        const memberData = {
          name: currentData.row[0] || "",
          email: body.email,
          frentes: body.frentes || currentData.row[2] || "",
          bolsa: currentData.row[3] || "",
          editor: 1, // Libera acesso
          pending: 0, // Remove de pendentes
          hp: body.hp,
          ho: body.ho,
        };
        const result = await updateMemberRow(memberData, false);
        if (result.success) {
          // Envia email de notificação ao usuário
          sendUserApproval(body.email, memberData.name).catch((e) =>
            console.error("Falha ao enviar email:", e)
          );
        }
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }
      case "validate-schedule": {
        // Valida se um schedule atende às regras de HP e HO
        if (!body.email || !body.scheduleRow) {
          return NextResponse.json(
            { error: "email e scheduleRow são obrigatórios" },
            { status: 400 }
          );
        }
        // Busca HP e HO do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        const hp = parseHours(member.row[6] || "0"); // HP é índice 6 (coluna G)
        const ho = parseHours(member.row[7] || "0"); // HO é índice 7 (coluna H)
        if (hp === 0 && ho === 0) {
          return NextResponse.json(
            {
              error:
                "Este membro ainda não tem HP e HO configurados pelo admin",
            },
            { status: 400 }
          );
        }
        // Valida o schedule
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
        
        // Busca dados do membro
        const member = await readMemberByEmail(body.email);
        if (!member) {
          return NextResponse.json(
            { error: "Membro não encontrado" },
            { status: 404 }
          );
        }
        
        const memberName = member.row[0] || "Usuário";
        
        // Atualiza para Editor=1, Pending=0 (libera acesso)
        const updateResult = await updateMemberAccess(body.email, 1, 0);
        if (!updateResult.success) {
          return NextResponse.json(
            { error: updateResult.message },
            { status: 500 }
          );
        }
        
        // Envia email para o usuário
        try {
          await sendAccessGrantedToUser(body.email, memberName);
        } catch (emailError) {
          console.error("Erro ao enviar email para usuário:", emailError);
          // Não falha a requisição se o email não enviar
        }
        
        return NextResponse.json({
          success: true,
          message: `Acesso liberado para ${memberName} (${body.email})`,
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
      // Busca dados do membro
      const member = await readMemberByEmail(email);
      if (!member) {
        // Erro: redireciona com mensagem de erro
        return NextResponse.redirect(
          new URL(`/horaise-admin?error=${encodeURIComponent(`Membro não encontrado: ${email}`)}`, process.env.NEXT_PUBLIC_BASE_URL || request.url)
        );
      }
      
      const memberName = member.row[0] || "Usuário";
      
      // Atualiza para Editor=1, Pending=0 (libera acesso)
      const updateResult = await updateMemberAccess(email, 1, 0);
      if (!updateResult.success) {
        // Erro: redireciona com mensagem de erro
        return NextResponse.redirect(
          new URL(`/horaise-admin?error=${encodeURIComponent(updateResult.message)}`, process.env.NEXT_PUBLIC_BASE_URL || request.url)
        );
      }
      
      // Envia email para o usuário
      try {
        await sendAccessGrantedToUser(email, memberName);
      } catch (emailError) {
        console.error("Erro ao enviar email para usuário:", emailError);
      }
      
      // Sucesso: redireciona com mensagem de sucesso
      return NextResponse.redirect(
        new URL(`/horaise-admin?success=${encodeURIComponent(`Acesso liberado para ${memberName}`)}`, process.env.NEXT_PUBLIC_BASE_URL || request.url)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/horaise-admin?error=${encodeURIComponent("Ação inválida")}`, process.env.NEXT_PUBLIC_BASE_URL || request.url)
    );
  } catch (error) {
    console.error("Erro no GET /api/admin:", error);
    return NextResponse.redirect(
      new URL(`/horaise-admin?error=${encodeURIComponent("Erro interno do servidor")}`, process.env.NEXT_PUBLIC_BASE_URL || request.url)
    );
  }
}
