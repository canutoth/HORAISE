import { google } from "googleapis";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = process.env.SHEET_NAME || "INFO";
const BACKLOG_SHEET_NAME = process.env.BACKLOG_SHEET_NAME || "BACKLOG";
export function escapeSheetName(name: string): string {
  if (!name) return name;
  return `'${name.replace(/'/g, "''")}'`;
}
export async function getSheetsClient() {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Credenciais do service account ausentes (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: GOOGLE_CLIENT_EMAIL, private_key: GOOGLE_PRIVATE_KEY },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  return { sheets };
}
export async function findRowByEmail(sheets: any, email: string): Promise<number | null> {
  const sheetRef = escapeSheetName(SHEET_NAME);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A:C`,
  });
  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] && row[1].toLowerCase() === email.toLowerCase()) {
      return i + 1;
    }
  }
  return null;
}
export async function readMemberByEmail(email: string): Promise<{ row: string[]; rowNumber: number } | null> {
  const { sheets } = await getSheetsClient();
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  const sheetRef = escapeSheetName(SHEET_NAME);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Includes columns A..I (Nome, Email, Frentes, Bolsa, Editor, Pending-Access, Pending-TimeTable, HP, HO)
    range: `${sheetRef}!A${rowNumber}:I${rowNumber}`,
  });
  const row = res.data.values?.[0] || [];
  return { row, rowNumber };
}
export async function readExample(): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Example includes Bolsa, Editor, Pending-Access, Pending-TimeTable, HP and HO
    range: `${sheetRef}!A2:I2`,
  });
  return res.data.values?.[0] || null;
}
export async function updateMemberRow(member: { name: string; email: string; frentes: string; bolsa?: string; editor?: number | string; pendingAccess?: number | string; pendingTimeTable?: number | string; hp?: string; ho?: string }, isNew: boolean) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const bolsa = member.bolsa ?? "";
  const editorFlag = isNew ? 0 : (member.editor ?? 0); // Novo cadastro sempre Editor=0
  const pendingAccessFlag = isNew ? 1 : (member.pendingAccess ?? 0); // Novo cadastro sempre Pending-Access=1
  const pendingTimeTableFlag = member.pendingTimeTable ?? 0; // Pending-TimeTable começa em 0
  const values = [[member.name, member.email, member.frentes, bolsa, editorFlag, pendingAccessFlag, pendingTimeTableFlag, member.hp ?? "", member.ho ?? ""]];
  if (isNew) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      // Append through HO column (A..I)
      range: `${sheetRef}!A:I`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    return { success: true, message: "Cadastro pendente criado. Aguarde aprovação do administrador." };
  }
  const rowNumber = await findRowByEmail(sheets, member.email);
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado para atualização" };
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    // Update A..I (including Bolsa, Editor, Pending-Access, Pending-TimeTable, HP, HO)
    range: `${sheetRef}!A${rowNumber}:I${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  return { success: true, message: "Membro atualizado com sucesso" };
}
export async function saveScheduleRow(email: string, scheduleRow: string[]) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return { success: false, message: `Email ${email} não encontrado` };
  // 7 dias x 13 horas = 91 colunas -> agora J..DX (após Bolsa, Editor, Pending-Access, Pending-TimeTable, HP, HO)
  const range = `${sheetRef}!J${rowNumber}:DX${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  
  // Marca Pending-TimeTable=1 após salvar (coluna G)
  const rangePendingTimeTable = `${sheetRef}!G${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangePendingTimeTable,
    valueInputOption: "RAW",
    requestBody: { values: [[1]] }, // Define Pending-TimeTable=1
  });
  
  return { success: true, message: "Schedule salvo e enviado para aprovação." };
}
export async function loadScheduleRow(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  // 7 dias x 13 horas = 91 colunas -> agora J..DX
  const range = `${sheetRef}!J${rowNumber}:DX${rowNumber}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return res.data.values?.[0] || [];
}
export async function readAllMembers(): Promise<string[][]> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  // Lê todos os dados de uma vez (A-DX = Nome, Email, Frentes, Bolsa, Editor, Pending-Access, Pending-TimeTable, HP, HO + Schedule)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Inclui toda a faixa até DX
    range: `${sheetRef}!A2:DX`,
  });
  return res.data.values || [];
}

/**
 * Atualiza apenas Editor e Pending-Access de um membro (usado para solicitação de acesso)
 * @param email Email do membro
 * @param editor Novo valor de Editor (1 = pode editar, 0 = bloqueado)
 * @param pendingAccess Novo valor de Pending-Access (1 = pendente, 0 = aprovado)
 */
export async function updateMemberAccess(email: string, editor: number, pendingAccess: number) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado" };
  }
  
  // Atualiza colunas E (Editor) e F (Pending-Access)
  const rangeEditorAndPending = `${sheetRef}!E${rowNumber}:F${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangeEditorAndPending,
    valueInputOption: "RAW",
    requestBody: { values: [[editor, pendingAccess]] },
  });
  
  return { success: true, message: "Acesso atualizado com sucesso" };
}

/**
 * Aprova schedule e opcionalmente remove acesso de edição
 * @param email Email do membro
 * @param keepEditor Se true, mantém Editor=1; se false, define Editor=0
 */
export async function approveSchedule(email: string, keepEditor: boolean) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado" };
  }
  
  const editorValue = keepEditor ? 1 : 0;
  // Atualiza colunas E (Editor) e G (Pending-TimeTable)
  const rangeEditorAndPendingTT = `${sheetRef}!E${rowNumber}:G${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangeEditorAndPendingTT,
    valueInputOption: "RAW",
    // Define Editor conforme parâmetro, mantém Pending-Access como está (posição F), e zera Pending-TimeTable (posição G)
    requestBody: { values: [[editorValue, "", 0]] }, // Deixa F vazio para não alterar
  });
  
  return { success: true, message: keepEditor ? "Schedule aprovado. Editor mantido." : "Schedule aprovado. Acesso de edição removido." };
}

/**
 * Lê as opções de frentes e bolsas da aba BACKLOG
 * A aba BACKLOG tem 4 colunas: Frentes (A), Emoji-Frente (B), Bolsa (C), Cor-Bolsa (D)
 */
export async function readBacklogOptions(): Promise<{ 
  frentes: Array<{ name: string; emoji: string }>; 
  bolsas: Array<{ name: string; color: string }> 
}> {
  const { sheets } = await getSheetsClient();
  const backlogSheetName = escapeSheetName(BACKLOG_SHEET_NAME);
  
  try {
    // Lê todas as linhas das colunas A até D (ignorando a primeira linha que é o cabeçalho)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${backlogSheetName}!A2:D`,
    });
    
    const rows = res.data.values || [];
    const frentes: Array<{ name: string; emoji: string }> = [];
    const bolsas: Array<{ name: string; color: string }> = [];
    
    for (const row of rows) {
      const frenteName = row[0]?.trim();
      const frenteEmoji = row[1]?.trim() || "📌";
      const bolsaName = row[2]?.trim();
      const bolsaColor = row[3]?.trim() || "#888888";
      
      if (frenteName && frenteName !== "") {
        frentes.push({ name: frenteName, emoji: frenteEmoji });
      }
      
      if (bolsaName && bolsaName !== "") {
        bolsas.push({ name: bolsaName, color: bolsaColor });
      }
    }
    
    return { frentes, bolsas };
  } catch (error) {
    console.error("Erro ao ler aba BACKLOG:", error);
    return { frentes: [], bolsas: [] };
  }
}

export const sheetsConstants = { SPREADSHEET_ID, SHEET_NAME, BACKLOG_SHEET_NAME };
