import { google } from "googleapis";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = process.env.SHEET_NAME || "INFO";
const BACKLOG_SHEET_NAME = process.env.BACKLOG_SHEET_NAME || "BACKLOG";
const RULES_SHEET_NAME = process.env.RULES_SHEET_NAME || "RULES";
const SUGGESTED_SHEET_NAME = process.env.SUGGESTED_SHEET_NAME || "SUGGESTION";
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
    // Includes columns A..J (Nome, Email, Frentes, Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP, HO)
    range: `${sheetRef}!A${rowNumber}:J${rowNumber}`,
  });
  const row = res.data.values?.[0] || [];
  return { row, rowNumber };
}
export async function readExample(): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Example includes Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP and HO
    range: `${sheetRef}!A2:J2`,
  });
  return res.data.values?.[0] || null;
}
export async function updateMemberRow(member: { name: string; email: string; frentes: string; bolsa?: string; editor?: number | string; pendingAccess?: number | string; pendingTimeTable?: number | string; pendingSuggestion?: number | string; hp?: string; ho?: string }, isNew: boolean) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const bolsa = member.bolsa ?? "";
  const editorFlag = isNew ? 0 : (member.editor ?? 0); // Novo cadastro sempre Editor=0
  const pendingAccessFlag = isNew ? 1 : (member.pendingAccess ?? 0); // Novo cadastro sempre Pending-Access=1
  const pendingTimeTableFlag = member.pendingTimeTable ?? 0; // Pending-TimeTable começa em 0
  const pendingSuggestionFlag = member.pendingSuggestion ?? 0; // Pending-Suggestion começa em 0
  const values = [[member.name, member.email, member.frentes, bolsa, editorFlag, pendingAccessFlag, pendingTimeTableFlag, pendingSuggestionFlag, member.hp ?? "", member.ho ?? ""]];
  if (isNew) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      // Append through HO column (A..J)
      range: `${sheetRef}!A:J`,
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
    // Update A..J (including Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP, HO)
    range: `${sheetRef}!A${rowNumber}:J${rowNumber}`,
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
  // 7 dias x 13 horas = 91 colunas -> agora K..EB (após Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP, HO)
  const range = `${sheetRef}!K${rowNumber}:EB${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  
  // Marca Pending-TimeTable=1 após salvar (coluna H)
  const rangePendingTimeTable = `${sheetRef}!H${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangePendingTimeTable,
    valueInputOption: "RAW",
    requestBody: { values: [[1]] }, // Define Pending-TimeTable=1
  });
  
  return { success: true, message: "Schedule salvo e enviado para aprovação." };
}

export async function saveScheduleRowAsException(email: string, scheduleRow: string[]) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return { success: false, message: `Email ${email} não encontrado` };
  // 7 dias x 13 horas = 91 colunas -> agora K..EB (após Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP, HO)
  const range = `${sheetRef}!K${rowNumber}:EB${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  
  // Marca Pending-TimeTable=2 para indicar exceção (coluna H)
  const rangePendingTimeTable = `${sheetRef}!H${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangePendingTimeTable,
    valueInputOption: "RAW",
    requestBody: { values: [[2]] }, // Define Pending-TimeTable=2 (exceção)
  });
  
  return { success: true, message: "Schedule salvo como exceção e enviado para aprovação." };
}

export async function loadScheduleRow(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  // 7 dias x 13 horas = 91 colunas -> agora K..EB
  const range = `${sheetRef}!K${rowNumber}:EB${rowNumber}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return res.data.values?.[0] || [];
}
export async function readAllMembers(): Promise<string[][]> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  // Lê todos os dados de uma vez (A-EB = Nome, Email, Frentes, Bolsa, Editor, Pending-Access, Pending-TimeTable, Pending-Suggestion, HP, HO + Schedule)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Inclui toda a faixa até EB
    range: `${sheetRef}!A2:EB`,
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
  // Atualiza colunas E (Editor) e H (Pending-TimeTable)
  const rangeEditorAndPendingTT = `${sheetRef}!E${rowNumber}:H${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangeEditorAndPendingTT,
    valueInputOption: "RAW",
    // Define Editor conforme parâmetro, mantém Pending-Access (F) e Pending-Suggestion (G) como estão, e zera Pending-TimeTable (H)
    requestBody: { values: [[editorValue, "", "", 0]] }, // Deixa F e G vazios para não alterar, zera H
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

/**
 * Lê as regras dinâmicas da aba RULES
 * A aba RULES tem 2 colunas: Regra (A), Valor (B)
 * Retorna objeto com as regras e seus valores
 */
export async function readRulesFromSheet(): Promise<{
  minimoSlotsConsecutivos: number;
  minimoSlotsDiariosPresencial: number;
  intervaloAlmoco: string;
}> {
  const { sheets } = await getSheetsClient();
  const rulesSheetName = escapeSheetName(RULES_SHEET_NAME);
  
  try {
    // Lê todas as linhas das colunas A até B (ignorando a primeira linha que é o cabeçalho)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${rulesSheetName}!A2:B`,
    });
    
    const rows = res.data.values || [];
    
    // Valores padrão caso não encontre na planilha
    let minimoSlotsConsecutivos = 2;
    let minimoSlotsDiariosPresencial = 4;
    let intervaloAlmoco = "11-14";
    
    for (const row of rows) {
      const regra = row[0]?.trim().toLowerCase();
      const valor = row[1]?.trim();
      
      // Aceita vários formatos para as regras
      if (regra.includes("slots seguidos") || regra.includes("slots_seguidos")) {
        minimoSlotsConsecutivos = parseInt(valor || "2", 10);
      } else if (regra.includes("slots diarios") || regra.includes("slots diários") || regra.includes("slots_diarios")) {
        minimoSlotsDiariosPresencial = parseInt(valor || "2", 10);
      } else if (regra.includes("almoss") || regra.includes("almoco") || regra.includes("almoço")) {
        intervaloAlmoco = valor || "11-14";
      }
    }
    
    return {
      minimoSlotsConsecutivos,
      minimoSlotsDiariosPresencial,
      intervaloAlmoco,
    };
  } catch (error) {
    console.error("Erro ao ler aba RULES:", error);
    // Retorna valores padrão em caso de erro
    return {
      minimoSlotsConsecutivos: 2,
      minimoSlotsDiariosPresencial: 4,
      intervaloAlmoco: "11-14",
    };
  }
}

/**
 * Salva um schedule sugerido pelo admin na aba SUGGESTED
 * A aba SUGGESTED tem colunas: Email (A) + 91 colunas de schedule (B..CL)
 * @param targetEmail Email do membro que receberá a sugestão
 * @param scheduleRow Array com 91 valores do schedule sugerido
 */
export async function saveSuggestedSchedule(targetEmail: string, scheduleRow: string[]) {
  const { sheets } = await getSheetsClient();
  const suggestedSheetName = escapeSheetName(SUGGESTED_SHEET_NAME);
  
  // Busca se já existe uma sugestão para este email
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${suggestedSheetName}!A:A`,
  });
  
  const rows = res.data.values || [];
  let rowNumber: number | null = null;
  
  // Procura pelo email (pula cabeçalho na linha 1)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === targetEmail.toLowerCase()) {
      rowNumber = i + 1;
      break;
    }
  }
  
  // Prepara a linha completa: [Email, ...scheduleRow]
  const fullRow = [targetEmail, ...scheduleRow];
  
  if (rowNumber) {
    // Atualiza a linha existente
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${suggestedSheetName}!A${rowNumber}:CL${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  } else {
    // Adiciona nova linha
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${suggestedSheetName}!A:CL`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  }
  
  // Marca Pending-Suggestion=1 na aba principal (coluna H)
  const mainRowNumber = await findRowByEmail(sheets, targetEmail);
  if (mainRowNumber) {
    const mainSheetRef = escapeSheetName(SHEET_NAME);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${mainSheetRef}!H${mainRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[1]] },
    });
  }
  
  return { success: true, message: "Sugestão de horário salva com sucesso." };
}

/**
 * Carrega o schedule sugerido da aba SUGGESTED
 * @param email Email do membro
 * @returns Array com 91 valores do schedule sugerido ou null se não existir
 */
export async function loadSuggestedSchedule(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const suggestedSheetName = escapeSheetName(SUGGESTED_SHEET_NAME);
  
  // Busca o email na aba SUGGESTED
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${suggestedSheetName}!A:CL`,
  });
  
  const rows = res.data.values || [];
  
  // Procura pelo email (pula cabeçalho na linha 1)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
      // Retorna as colunas B..CL (índices 1..91)
      return rows[i].slice(1, 92);
    }
  }
  
  return null;
}

/**
 * Aceita o schedule sugerido: move da aba SUGGESTED para a aba principal e limpa flags
 * @param email Email do membro
 */
export async function acceptSuggestedSchedule(email: string) {
  const { sheets } = await getSheetsClient();
  
  // 1. Carrega o schedule sugerido
  const suggestedSchedule = await loadSuggestedSchedule(email);
  if (!suggestedSchedule) {
    return { success: false, message: "Nenhuma sugestão encontrada." };
  }
  
  // 2. Salva o schedule sugerido na aba principal
  const mainRowNumber = await findRowByEmail(sheets, email);
  if (!mainRowNumber) {
    return { success: false, message: "Membro não encontrado." };
  }
  
  const mainSheetRef = escapeSheetName(SHEET_NAME);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${mainSheetRef}!K${mainRowNumber}:EB${mainRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [suggestedSchedule] },
  });
  
  // 3. Limpa Pending-Suggestion=0 na aba principal (coluna H)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${mainSheetRef}!H${mainRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[0]] },
  });
  
  // 4. Remove a linha da aba SUGGESTED
  const suggestedSheetName = escapeSheetName(SUGGESTED_SHEET_NAME);
  const resFind = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${suggestedSheetName}!A:A`,
  });
  
  const rows = resFind.data.values || [];
  let suggestedRowNumber: number | null = null;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
      suggestedRowNumber = i + 1;
      break;
    }
  }
  
  if (suggestedRowNumber) {
    // Limpa a linha da aba SUGGESTED
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${suggestedSheetName}!A${suggestedRowNumber}:CL${suggestedRowNumber}`,
    });
  }
  
  return { success: true, message: "Sugestão aceita com sucesso!" };
}

export const sheetsConstants = { SPREADSHEET_ID, SHEET_NAME, BACKLOG_SHEET_NAME, SUGGESTED_SHEET_NAME };
