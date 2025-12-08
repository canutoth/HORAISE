import nodemailer from "nodemailer";
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
export async function sendAdminNotification(newMemberName: string, newMemberEmail: string) {
  const adminEmail = process.env.EMAIL_ADMIN;
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmail,
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
  const adminEmail = process.env.EMAIL_ADMIN;
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmail,
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
  const adminEmail = process.env.EMAIL_ADMIN;
  const approveUrl = `${BASE_URL}/api/admin?action=quick-approve-access&email=${encodeURIComponent(userEmail)}`;
  
  const mailOptions = {
    from: `"HORAISE" <${process.env.SMTP_USER}>`,
    to: adminEmail,
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