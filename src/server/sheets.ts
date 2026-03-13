import { google } from "googleapis";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = process.env.SHEET_NAME || "INFO";
const BACKLOG_SHEET_NAME = process.env.BACKLOG_SHEET_NAME || "BACKLOG";
const RULES_SHEET_NAME = process.env.RULES_SHEET_NAME || "RULES";
const SUGGESTED_SHEET_NAME = process.env.SUGGESTED_SHEET_NAME || "SUGGESTION";
const PRESENCIAL_BOLSA_SHEET_NAME = process.env.PRESENCIAL_BOLSA_SHEET_NAME || "PRESENCIAL_BOLSA";

// Cache para o mapeamento de colunas (para não precisar buscar toda vez)
let columnMappingCache: Map<string, number> | null = null;

/**
 * Lê o cabeçalho da planilha e retorna um Map de nome da coluna -> índice
 * Usa cache para evitar múltiplas leituras
 */
export async function getColumnMapping(sheets: any, forceRefresh = false): Promise<Map<string, number>> {
  if (columnMappingCache && !forceRefresh) {
    return columnMappingCache;
  }
  
  const sheetRef = escapeSheetName(SHEET_NAME);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!1:1`, // Lê apenas a primeira linha (cabeçalho)
  });
  
  const headers = response.data.values?.[0] || [];
  const mapping = new Map<string, number>();
  
  headers.forEach((header: string, index: number) => {
    // Normaliza o nome da coluna removendo espaços extras
    const normalizedHeader = header?.trim();
    if (normalizedHeader) {
      mapping.set(normalizedHeader, index);
    }
  });
  
  columnMappingCache = mapping;
  return mapping;
}

/**
 * Helper para obter o valor de uma coluna pelo nome ao invés do índice
 */
export function getColumnValue(row: string[], columnName: string, columnMapping: Map<string, number>): string {
  const index = columnMapping.get(columnName);
  if (index === undefined) {
    console.warn(`Coluna "${columnName}" não encontrada no cabeçalho`);
    return "";
  }
  return row[index] || "";
}

/**
 * Helper para obter o índice de uma coluna pelo nome
 */
export function getColumnIndex(columnName: string, columnMapping: Map<string, number>): number {
  const index = columnMapping.get(columnName);
  if (index === undefined) {
    throw new Error(`Coluna "${columnName}" não encontrada no cabeçalho`);
  }
  return index;
}

/**
 * Converte índice de coluna (0-based) para letra de coluna do Excel (A, B, ..., Z, AA, AB, ...)
 */
export function columnIndexToLetter(index: number): string {
  let letter = '';
  let num = index;
  
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  
  return letter;
}

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
  const columnMapping = await getColumnMapping(sheets);
  const emailIndex = getColumnIndex("Email", columnMapping);
  
  // Lê as primeiras 3 colunas para encontrar o email (otimização)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A:C`,
  });
  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Usa o índice da coluna Email
    if (row[emailIndex] && row[emailIndex].toLowerCase() === email.toLowerCase()) {
      return i + 1;
    }
  }
  return null;
}
export async function readMemberByEmail(email: string): Promise<{ row: string[]; rowNumber: number; columnMapping: Map<string, number> } | null> {
  const { sheets } = await getSheetsClient();
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  const sheetRef = escapeSheetName(SHEET_NAME);
  
  // Lê até a maior coluna entre HO e Apelido
  const hoIndex = getColumnIndex("HO", columnMapping);
  const nicknameIndex = columnMapping.get("Apelido") ?? -1;
  const lastBaseIndex = Math.max(hoIndex, nicknameIndex);
  const lastColumn = columnIndexToLetter(lastBaseIndex);
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A${rowNumber}:${lastColumn}${rowNumber}`,
  });
  const row = res.data.values?.[0] || [];
  return { row, rowNumber, columnMapping };
}
export async function readExample(): Promise<{ row: string[]; columnMapping: Map<string, number> } | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const columnMapping = await getColumnMapping(sheets);
  
  // Lê até a maior coluna entre HO e Apelido
  const hoIndex = getColumnIndex("HO", columnMapping);
  const nicknameIndex = columnMapping.get("Apelido") ?? -1;
  const lastBaseIndex = Math.max(hoIndex, nicknameIndex);
  const lastColumn = columnIndexToLetter(lastBaseIndex);
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A2:${lastColumn}2`,
  });
  const row = res.data.values?.[0];
  if (!row) return null;
  return { row, columnMapping };
}
export async function updateMemberRow(member: { name: string; nickname?: string; email: string; frentes: string; bolsa?: string; editor?: number | string; pendingAccess?: number | string; pendingTimeTable?: number | string; pendingSuggestion?: number | string; hp?: string; ho?: string }, isNew: boolean) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const columnMapping = await getColumnMapping(sheets);
  
  const bolsa = member.bolsa ?? "";
  const editorFlag = isNew ? 0 : (member.editor ?? 0); // Novo cadastro sempre Editor=0
  const pendingAccessFlag = isNew ? 1 : (member.pendingAccess ?? 0); // Novo cadastro sempre Pending-Access=1
  const pendingTimeTableFlag = member.pendingTimeTable ?? 0; // Pending-TimeTable começa em 0
  const pendingSuggestionFlag = member.pendingSuggestion ?? 0; // Pending-Suggestion começa em 0
  
  // Cria um array com o tamanho correto baseado no mapeamento de colunas
  const hoIndex = getColumnIndex("HO", columnMapping);
  const nicknameIndex = columnMapping.get("Apelido") ?? -1;
  const lastBaseIndex = Math.max(hoIndex, nicknameIndex);
  const rowArray = new Array(lastBaseIndex + 1).fill("");
  
  // Preenche os valores usando os nomes das colunas
  rowArray[getColumnIndex("Nome", columnMapping)] = member.name;
  if (nicknameIndex >= 0) {
    rowArray[nicknameIndex] = member.nickname ?? "";
  }
  rowArray[getColumnIndex("Email", columnMapping)] = member.email;
  rowArray[getColumnIndex("Frentes", columnMapping)] = member.frentes;
  rowArray[getColumnIndex("Bolsa", columnMapping)] = bolsa;
  rowArray[getColumnIndex("Editor", columnMapping)] = editorFlag;
  rowArray[getColumnIndex("Pending-Access", columnMapping)] = pendingAccessFlag;
  rowArray[getColumnIndex("Pending-TimeTable", columnMapping)] = pendingTimeTableFlag;
  rowArray[getColumnIndex("Pending-Suggestion", columnMapping)] = pendingSuggestionFlag;
  rowArray[getColumnIndex("HP", columnMapping)] = member.hp ?? "";
  rowArray[getColumnIndex("HO", columnMapping)] = member.ho ?? "";
  
  const values = [rowArray];
  
  if (isNew) {
    const lastColumn = columnIndexToLetter(lastBaseIndex);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetRef}!A:${lastColumn}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    return { success: true, message: "Cadastro pendente criado. Aguarde aprovação do administrador." };
  }
  const rowNumber = await findRowByEmail(sheets, member.email);
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado para atualização" };
  }
  
  const lastColumn = columnIndexToLetter(lastBaseIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A${rowNumber}:${lastColumn}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  return { success: true, message: "Membro atualizado com sucesso" };
}
export async function saveScheduleRow(email: string, scheduleRow: string[]) {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return { success: false, message: `Email ${email} não encontrado` };
  
  // Calcula o range das colunas de schedule (começa após HO)
  const hoIndex = getColumnIndex("HO", columnMapping);
  const scheduleStartCol = columnIndexToLetter(hoIndex + 1);
  // 7 dias x 13 horas = 91 colunas
  const scheduleEndCol = columnIndexToLetter(hoIndex + 91);
  const range = `${sheetRef}!${scheduleStartCol}${rowNumber}:${scheduleEndCol}${rowNumber}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  
  // Marca Pending-TimeTable=1 após salvar
  const pendingTimeTableIndex = getColumnIndex("Pending-TimeTable", columnMapping);
  const pendingTimeTableCol = columnIndexToLetter(pendingTimeTableIndex);
  const rangePendingTimeTable = `${sheetRef}!${pendingTimeTableCol}${rowNumber}`;
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
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return { success: false, message: `Email ${email} não encontrado` };
  
  // Calcula o range das colunas de schedule (começa após HO)
  const hoIndex = getColumnIndex("HO", columnMapping);
  const scheduleStartCol = columnIndexToLetter(hoIndex + 1);
  // 7 dias x 13 horas = 91 colunas
  const scheduleEndCol = columnIndexToLetter(hoIndex + 91);
  const range = `${sheetRef}!${scheduleStartCol}${rowNumber}:${scheduleEndCol}${rowNumber}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [scheduleRow] },
  });
  
  // Marca Pending-TimeTable=2 para indicar exceção solicitada
  const pendingTimeTableIndex = getColumnIndex("Pending-TimeTable", columnMapping);
  const pendingTimeTableCol = columnIndexToLetter(pendingTimeTableIndex);
  const rangePendingTimeTable = `${sheetRef}!${pendingTimeTableCol}${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangePendingTimeTable,
    valueInputOption: "RAW",
    requestBody: { values: [[2]] }, // Define Pending-TimeTable=2 (exceção solicitada)
  });
  
  return { success: true, message: "Schedule salvo como exceção e enviado para aprovação." };
}

export async function loadScheduleRow(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  if (!rowNumber) return null;
  
  // Calcula o range das colunas de schedule (começa após HO)
  const hoIndex = getColumnIndex("HO", columnMapping);
  const scheduleStartCol = columnIndexToLetter(hoIndex + 1);
  // 7 dias x 13 horas = 91 colunas
  const scheduleEndCol = columnIndexToLetter(hoIndex + 91);
  const range = `${sheetRef}!${scheduleStartCol}${rowNumber}:${scheduleEndCol}${rowNumber}`;
  
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return res.data.values?.[0] || [];
}
export async function readAllMembers(): Promise<string[][]> {
  const { sheets } = await getSheetsClient();
  const sheetRef = escapeSheetName(SHEET_NAME);
  const columnMapping = await getColumnMapping(sheets);
  const hoIndex = getColumnIndex("HO", columnMapping);
  const endColumn = columnIndexToLetter(hoIndex + 91);

  // Lê todos os dados incluindo o cabeçalho e as 91 colunas de schedule
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A1:${endColumn}`,
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
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado" };
  }
  
  // Atualiza coluna Editor
  const editorIndex = getColumnIndex("Editor", columnMapping);
  const editorCol = columnIndexToLetter(editorIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!${editorCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[editor]] },
  });
  
  // Atualiza coluna Pending-Access
  const pendingAccessIndex = getColumnIndex("Pending-Access", columnMapping);
  const pendingAccessCol = columnIndexToLetter(pendingAccessIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!${pendingAccessCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[pendingAccess]] },
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
  const columnMapping = await getColumnMapping(sheets);
  const rowNumber = await findRowByEmail(sheets, email);
  
  if (!rowNumber) {
    return { success: false, message: "Membro não encontrado" };
  }
  
  const editorValue = keepEditor ? 1 : 0;
  
  // Zera tanto Pending-TimeTable quanto Pending-Suggestion ao aprovar
  const editorIndex = getColumnIndex("Editor", columnMapping);
  const pendingTimeTableIndex = getColumnIndex("Pending-TimeTable", columnMapping);
  const pendingSuggestionIndex = getColumnIndex("Pending-Suggestion", columnMapping);
  
  const editorCol = columnIndexToLetter(editorIndex);
  const pendingTimeTableCol = columnIndexToLetter(pendingTimeTableIndex);
  const pendingSuggestionCol = columnIndexToLetter(pendingSuggestionIndex);
  
  // Atualiza Editor
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!${editorCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[editorValue]] },
  });
  
  // Zera Pending-TimeTable
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!${pendingTimeTableCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[0]] },
  });
  
  // Zera Pending-Suggestion
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!${pendingSuggestionCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[0]] },
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
    // Lê todas as linhas incluindo o cabeçalho
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${backlogSheetName}!A1:D`,
    });
    
    const rows = res.data.values || [];
    if (rows.length === 0) return { frentes: [], bolsas: [] };
    
    // Primeira linha é o cabeçalho
    const headerRow = rows[0];
    const columnMapping = new Map<string, number>();
    headerRow.forEach((col: string, idx: number) => {
      columnMapping.set(col, idx);
    });
    
    const frentes: Array<{ name: string; emoji: string }> = [];
    const bolsas: Array<{ name: string; color: string }> = [];
    
    // Processa linhas de dados (pula o cabeçalho)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const frenteName = getColumnValue(row, "Frentes", columnMapping)?.trim();
      const frenteEmoji = getColumnValue(row, "Emoji-Frente", columnMapping)?.trim() || "📌";
      const bolsaName = getColumnValue(row, "Bolsa", columnMapping)?.trim();
      const bolsaColor = getColumnValue(row, "Cor-Bolsa", columnMapping)?.trim() || "#888888";
      
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
  inicio: number;
  fim: number;
}> {
  const { sheets } = await getSheetsClient();
  const rulesSheetName = escapeSheetName(RULES_SHEET_NAME);
  
  try {
    // Lê todas as linhas incluindo o cabeçalho
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${rulesSheetName}!A1:B`,
    });
    
    const rows = res.data.values || [];
    if (rows.length === 0) {
      // Retorna valores padrão se não houver dados
      return {
        minimoSlotsConsecutivos: 2,
        minimoSlotsDiariosPresencial: 4,
        intervaloAlmoco: "11-14",
        inicio: 8,
        fim: 20,
      };
    }
    
    // Primeira linha é o cabeçalho
    const headerRow = rows[0];
    const columnMapping = new Map<string, number>();
    headerRow.forEach((col: string, idx: number) => {
      columnMapping.set(col, idx);
    });
    
    // Valores padrão caso não encontre na planilha
    let minimoSlotsConsecutivos = 2;
    let minimoSlotsDiariosPresencial = 4;
    let intervaloAlmoco = "11-14";
    let inicio = 8; // Padrão: 8h
    let fim = 20; // Padrão: 20h (fim do range, não inclusivo)
    
    // Processa linhas de dados (pula o cabeçalho)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const regra = getColumnValue(row, "Regra", columnMapping)?.trim().toLowerCase();
      const valor = getColumnValue(row, "Valor", columnMapping)?.trim();
      
      // Aceita vários formatos para as regras
      if (regra.includes("slots seguidos") || regra.includes("slots_seguidos")) {
        minimoSlotsConsecutivos = parseInt(valor || "2", 10);
      } else if (regra.includes("slots diarios") || regra.includes("slots diários") || regra.includes("slots_diarios")) {
        minimoSlotsDiariosPresencial = parseInt(valor || "2", 10);
      } else if (regra.includes("almoss") || regra.includes("almoco") || regra.includes("almoço")) {
        intervaloAlmoco = valor || "11-14";
      } else if (regra.includes("inicio") || regra.includes("início")) {
        inicio = parseInt(valor || "8", 10);
      } else if (regra.includes("fim")) {
        fim = parseInt(valor || "20", 10);
      }
    }
    
    return {
      minimoSlotsConsecutivos,
      minimoSlotsDiariosPresencial,
      intervaloAlmoco,
      inicio,
      fim,
    };
  } catch (error) {
    console.error("Erro ao ler aba RULES:", error);
    // Retorna valores padrão em caso de erro
    return {
      minimoSlotsConsecutivos: 2,
      minimoSlotsDiariosPresencial: 4,
      intervaloAlmoco: "11-14",
      inicio: 8,
      fim: 20,
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
  
  console.log(`saveSuggestedSchedule: scheduleRow length=${scheduleRow.length}, fullRow length=${fullRow.length}`);
  
  if (fullRow.length !== 92) {
    console.error(`ERRO: fullRow deveria ter 92 elementos (1 email + 91 schedule) mas tem ${fullRow.length}`);
  }
  
  if (rowNumber) {
    // Atualiza a linha existente
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${suggestedSheetName}!A${rowNumber}:CN${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  } else {
    // Adiciona nova linha
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${suggestedSheetName}!A:CN`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  }
  
  // Marca Pending-Suggestion=1 E concede acesso de edição (Editor=1) na aba principal
  const mainRowNumber = await findRowByEmail(sheets, targetEmail);
  if (mainRowNumber) {
    const mainSheetRef = escapeSheetName(SHEET_NAME);
    const mainColumnMapping = await getColumnMapping(sheets);
    
    const pendingSuggestionIndex = getColumnIndex("Pending-Suggestion", mainColumnMapping);
    const pendingSuggestionCol = columnIndexToLetter(pendingSuggestionIndex);
    
    const editorIndex = getColumnIndex("Editor", mainColumnMapping);
    const editorCol = columnIndexToLetter(editorIndex);
    
    const pendingAccessIndex = getColumnIndex("Pending-Access", mainColumnMapping);
    const pendingAccessCol = columnIndexToLetter(pendingAccessIndex);
    
    // Atualiza Pending-Suggestion=1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${mainSheetRef}!${pendingSuggestionCol}${mainRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[1]] },
    });
    
    // Concede acesso de edição (Editor=1, Pending-Access=0)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${mainSheetRef}!${editorCol}${mainRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[1]] },
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${mainSheetRef}!${pendingAccessCol}${mainRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[0]] },
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
    range: `${suggestedSheetName}!A:CN`,
  });
  
  const rows = res.data.values || [];
  
  // Procura pelo email (pula cabeçalho na linha 1)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
      // Retorna as colunas B..CN (índices 1..92), mas limitado a 91 elementos
      return rows[i].slice(1, 92);
    }
  }
  
  return null;
}

/**
 * Salva o detalhamento por bolsa dos slots presenciais na aba PRESENCIAL_BOLSA
 * Formato: Email (A) + 91 colunas de schedule (B..CN)
 */
export async function savePresencialBolsaRow(email: string, presencialBolsaRow: string[]) {
  const { sheets } = await getSheetsClient();
  const presencialBolsaSheetName = escapeSheetName(PRESENCIAL_BOLSA_SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${presencialBolsaSheetName}!A:A`,
  });

  const rows = res.data.values || [];
  let rowNumber: number | null = null;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
      rowNumber = i + 1;
      break;
    }
  }

  const fullRow = [email, ...presencialBolsaRow];

  if (rowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${presencialBolsaSheetName}!A${rowNumber}:CN${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${presencialBolsaSheetName}!A:CN`,
      valueInputOption: "RAW",
      requestBody: { values: [fullRow] },
    });
  }

  return { success: true, message: "Detalhamento presencial por bolsa salvo com sucesso." };
}

/**
 * Carrega o detalhamento por bolsa dos slots presenciais da aba PRESENCIAL_BOLSA
 */
export async function loadPresencialBolsaRow(email: string): Promise<string[] | null> {
  const { sheets } = await getSheetsClient();
  const presencialBolsaSheetName = escapeSheetName(PRESENCIAL_BOLSA_SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${presencialBolsaSheetName}!A:CN`,
  });

  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase() === email.toLowerCase()) {
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
  const columnMapping = await getColumnMapping(sheets);
  
  // Calcula o range das colunas de schedule (começa após HO)
  const hoIndex = getColumnIndex("HO", columnMapping);
  const scheduleStartCol = columnIndexToLetter(hoIndex + 1);
  // 7 dias x 13 horas = 91 colunas
  const scheduleEndCol = columnIndexToLetter(hoIndex + 91);
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${mainSheetRef}!${scheduleStartCol}${mainRowNumber}:${scheduleEndCol}${mainRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [suggestedSchedule] },
  });
  
  // 3. Limpa Pending-Suggestion=0 e Editor=0 na aba principal
  const pendingSuggestionIndex = getColumnIndex("Pending-Suggestion", columnMapping);
  const pendingSuggestionCol = columnIndexToLetter(pendingSuggestionIndex);
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${mainSheetRef}!${pendingSuggestionCol}${mainRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[0]] },
  });
  
  // Remove acesso de edição ao aceitar sugestão
  const editorIndex = getColumnIndex("Editor", columnMapping);
  const editorCol = columnIndexToLetter(editorIndex);
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${mainSheetRef}!${editorCol}${mainRowNumber}`,
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

export const sheetsConstants = {
  SPREADSHEET_ID,
  SHEET_NAME,
  BACKLOG_SHEET_NAME,
  SUGGESTED_SHEET_NAME,
  PRESENCIAL_BOLSA_SHEET_NAME,
};
