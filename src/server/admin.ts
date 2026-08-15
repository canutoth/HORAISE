import { getAdminEmailsFromSheet } from "./sheets";

/**
 * Verifica se o email pertence a um administrador.
 * Admins são derivados do compartilhamento da planilha: todo usuário com
 * acesso de edição (Share -> Editor, role writer/owner no Google Drive)
 * é considerado admin.
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const target = email.toLowerCase().trim();
  const admins = await getAdminEmailsFromSheet();
  return admins.some((e) => e === target);
}
