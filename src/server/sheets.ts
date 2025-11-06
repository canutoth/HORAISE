import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = process.env.SHEET_NAME || "INFO";

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
    // Includes columns A..F (Nome, Email, Frentes, Editor, HP, HO)
    range: `${sheetRef}!A${rowNumber}:F${rowNumber}`,
  });
  const row = res.data.values?.[0] || [];
  return { row, rowNumber };
}

export async function readExample(): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Example now includes HP and HO
    range: `${sheetRef}!A2:F2`,
  });
  return res.data.values?.[0] || null;
}

export async function updateMemberRow(member: { name: string; email: string; frentes: string; editor?: number | string; hp?: string; ho?: string }, isNew: boolean) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const editorFlag = (member.editor ?? 0);
  const values = [[member.name, member.email, member.frentes, editorFlag, member.hp ?? "", member.ho ?? ""]];
  if (isNew) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      // Append through HO column (A..F)
      range: `${sheetRef}!A:F`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    return { success: true, message: "Novo membro adicionado com sucesso" };
  }
  const rowNumber = await findRowByEmail(sheets, member.email);
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado para atualização" };
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    // Update A..F (including Editor, HP, HO)
    range: `${sheetRef}!A${rowNumber}:F${rowNumber}`,
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
  // 7 dias x 13 horas = 91 colunas -> agora G..CS (Editor + HP + HO deslocam)
  const range = `${sheetRef}!G${rowNumber}:CS${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  return { success: true, message: "Schedule salvo" };
}

export async function loadScheduleRow(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  // 7 dias x 13 horas = 91 colunas -> agora G..CS
  const range = `${sheetRef}!G${rowNumber}:CS${rowNumber}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return res.data.values?.[0] || [];
}

export async function readAllMembers(): Promise<string[][]> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  // Lê todos os dados de uma vez (A-CS = Nome, Email, Frentes, Editor, HP, HO + Schedule)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Inclui toda a faixa até CS
    range: `${sheetRef}!A2:CS`,
  });
  return res.data.values || [];
}

export const sheetsConstants = { SPREADSHEET_ID, SHEET_NAME };
