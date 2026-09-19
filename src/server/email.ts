import nodemailer from "nodemailer";
import { getAdminEmailsFromAdminsEmailTab } from "./sheets";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Retorna a lista de emails que devem receber notificações de admin.
 * Fonte principal: aba "admins-email" da planilha (pode ter vários).
 * Fallback: env EMAIL_ADMIN caso a aba esteja vazia/indisponível.
 */
async function getAdminEmailRecipients(): Promise<string[]> {
  try {
    const fromTab = await getAdminEmailsFromAdminsEmailTab();
    if (fromTab.length > 0) return fromTab;
  } catch (err) {
    console.warn("Falha ao ler aba admins-email:", err);
  }
  const fallback = process.env.EMAIL_ADMIN;
  if (fallback) return [fallback.toLowerCase().trim()];
  return [];
}
export async function sendAdminNotification(newMemberName: string, newMemberEmail: string) {
  const adminEmails = await getAdminEmailRecipients();
  if (adminEmails.length === 0) {
    console.warn("[sendAdminNotification] Nenhum admin configurado; email não enviado.");
    return;
  }
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(", "),
    subject: `🔔 Novo Cadastro Pendente: ${newMemberName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Novo membro cadastrado!</h2>
        <p><strong>Nome:</strong> ${newMemberName}</p>
        <p><strong>Email:</strong> ${newMemberEmail}</p>
        <p>Este usuário está aguardando a validação do seu cadastro.</p>
        <br/>
        <p>Acesse o painel de administração para:</p>
        <ul>
          <li>Definir quantidade de horas presenciais</li>
          <li>Definir quantidade de horas online</li>
          <li>Validar/editar as frentes informadas</li>
          <li>Liberar acesso ao editor</li>
        </ul>
        <br/>
        <a href="${BASE_URL}/horaise-admin" style="background: #52afe1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Painel Admin</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

export async function sendScheduleEditedToAdmin(userName: string, userEmail: string) {
  const adminEmails = await getAdminEmailRecipients();
  if (adminEmails.length === 0) {
    console.warn("[sendScheduleEditedToAdmin] Nenhum admin configurado; email não enviado.");
    return;
  }
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(", "),
    subject: `📅 Schedule Editado - Aguardando Aprovação: ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Schedule Atualizado!</h2>
        <p><strong>Usuário:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p>Este usuário editou seus horários e está aguardando sua aprovação.</p>
        <br/>
        <p>Acesse o painel de administração para revisar e aprovar as alterações.</p>
        <br/>
        <a href="${BASE_URL}/horaise-admin" style="background: #52afe1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Painel Admin</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

export async function sendScheduleApprovedToUser(userEmail: string, userName: string, keepEditor: boolean) {
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `✅ Seus horários foram aprovados!`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h3>Olá, ${userName}!</h3>
        <p>Seu schedule foi aprovado pelo administrador.</p>
        <br/>
        <a href="${BASE_URL}/horaise-viewer" style="background: #52afe1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Meu Schedule</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

export async function sendAccessRequestToAdmin(userName: string, userEmail: string) {
  const adminEmails = await getAdminEmailRecipients();
  if (adminEmails.length === 0) {
    console.warn("[sendAccessRequestToAdmin] Nenhum admin configurado; email não enviado.");
    return;
  }
  const approveUrl = `${BASE_URL}/api/admin?action=quick-approve-access&email=${encodeURIComponent(userEmail)}`;
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(", "),
    subject: `🔓 Solicitação de Acesso de Edição: ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Solicitação de Acesso</h2>
        <p><strong>Usuário:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p>Este usuário está solicitando permissão para editar sua agenda.</p>
        <br/>
        <a href="${approveUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Liberar Acesso</a>
        <a href="${BASE_URL}/horaise-admin" style="background: #52afe1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Painel Admin</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

export async function sendAccessGrantedToUser(userEmail: string, userName: string) {
  console.log(`[sendAccessGrantedToUser] Iniciando envio para ${userEmail}`);
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `✅ Acesso de edição liberado!`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h3>Olá, ${userName}!</h3>
        <p>Sua solicitação de edição foi aprovada pelo administrador.</p>
        <p>Você já pode atualizar sua agenda no HORAISE.</p>
        <div style="background: #fff3cd; padding: 15px; border-left: 5px solid #ffc107; margin: 20px 0;">
          <strong>⚠️ Lembre-se:</strong> Após clicar em "Salvar Alterações" na sua agenda, seu acesso de edição será bloqueado automaticamente. Para editar novamente no futuro, solicite nova liberação ao administrador.
        </div>
        <br/>
        <a href="${BASE_URL}/horaise-editor" style="background: #52afe1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Editor</a>
      </div>
    `,
  };
  
  console.log(`[sendAccessGrantedToUser] Enviando email para ${userEmail}...`);
  const result = await transporter.sendMail(mailOptions);
  console.log(`[sendAccessGrantedToUser] Email enviado! MessageId: ${result.messageId}`);
  return result;
}
/**
 * Envia email ao usuário notificando que o admin sugeriu um novo horário
 */
export async function sendSuggestionToUser(userEmail: string, userName: string) {
  console.log(`[sendSuggestionToUser] Iniciando envio para ${userEmail}`);
  console.log(`[SMTP Config] Host: ${process.env.SMTP_HOST}, Port: ${process.env.SMTP_PORT}, User: ${process.env.SMTP_USER}`);
  
  const viewerUrl = `${BASE_URL}/horaise-viewer?personid=${encodeURIComponent(userEmail)}`;
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `📝 Nova Sugestão de Horário do Administrador`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Olá, ${userName}!</h2>
        <p>O administrador sugeriu um novo horário para você.</p>
        <p>Clique no botão abaixo para visualizar sua agenda.</p>
        <br/>
        <a href="${viewerUrl}" style="background: #52afe1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Meu Horário</a>
      </div>
    `,
  };
  
  console.log(`[sendSuggestionToUser] Enviando email para ${userEmail}...`);
  const result = await transporter.sendMail(mailOptions);
  console.log(`[sendSuggestionToUser] Email enviado! MessageId: ${result.messageId}`);
  return result;
}
export async function sendExceptionRequestToAdmin(userName: string, userEmail: string, violations: string[]) {
  const adminEmails = await getAdminEmailRecipients();
  if (adminEmails.length === 0) {
    console.warn("[sendExceptionRequestToAdmin] Nenhum admin configurado; email não enviado.");
    return;
  }
  
  const violationsList = violations.map(v => `<li>${v}</li>`).join("");
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(", "),
    subject: `⚠️ Solicitação de Exceção de Horário: ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Solicitação de Exceção de Horário</h2>
        <p><strong>Usuário:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <br/>
        <div style="background: #fff3cd; padding: 15px; border-left: 5px solid #ffc107; margin: 20px 0;">
          <strong>⚠️ Este usuário solicitou uma exceção às regras de horário.</strong>
          <p style="margin-top: 10px;">O horário proposto viola as seguintes regras:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${violationsList}
          </ul>
        </div>
        <p>O horário foi salvo e está aguardando sua análise.</p>
        <br/>
        <p><strong>Ações disponíveis no painel:</strong></p>
        <ul>
          <li>✅ Aprovar o horário</li>
          <li>✏️ Ajustar/definir um novo horário diretamente</li>
        </ul>
        <br/>
        <a href="${BASE_URL}/horaise-admin/dashboard" style="background: #ffc107; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Solicitação no Painel</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}
export async function sendUserApproval(userEmail: string, userName: string) {
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `✅ Cadastro HORAISE concluído!`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h3>Olá, ${userName}!</h3>
        <p>Seu perfil foi validado pelo administrador.</p>
        <p>Você já pode acessar o HORAISE para preencher seus horários.</p>
        <br/>
        <a href="${BASE_URL}/horaise-editor" style="background: #52afe1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Preencher Horários</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

export async function sendProfileChangeToUser(userEmail: string, userName: string, field: string, oldValue: string, newValue: string) {
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `🔔 Seu perfil foi atualizado pelo administrador`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h3>Olá, ${userName}!</h3>
        <p>O administrador atualizou uma informação do seu perfil no HORAISE:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Campo alterado:</strong> ${field}</p>
          <p><strong>Valor anterior:</strong> ${oldValue}</p>
          <p><strong>Novo valor:</strong> <span style="color: #28a745; font-weight: bold;">${newValue}</span></p>
        </div>
        <p>Se você tiver alguma dúvida sobre essa alteração, entre em contato com o administrador.</p>
        <br/>
        <a href="${BASE_URL}/horaise-editor" style="background: #52afe1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Meu Perfil</a>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}