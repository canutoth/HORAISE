import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = "HORAISE";

// Configura autenticação com Service Account
function getAuthClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS não configurado");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

/**
 * Encontra a linha de uma pessoa pelo email na planilha HORAISE
 */
async function findRowByEmail(sheets: any, email: string): Promise<number | null> {
  // Lê a coluna B (Email) - começando da linha 2 (pulando cabeçalho)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!B:B`,
  });

  const emails = response.data.values || [];
  
  // Encontra a linha (índice + 1 porque sheets são 1-indexed, +1 pelo cabeçalho)
  for (let i = 1; i < emails.length; i++) {
    if (emails[i][0] === email) {
      return i + 1; // Retorna o número da linha (1-indexed)
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, scheduleRow } = await request.json();

    if (!email || !scheduleRow) {
      return NextResponse.json(
        { success: false, message: "email e scheduleRow são obrigatórios" },
        { status: 400 }
      );
    }

    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { success: false, message: "ID da planilha HORAISE não configurado" },
        { status: 500 }
      );
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    // Encontra a linha da pessoa
    const rowNumber = await findRowByEmail(sheets, email);
    
    if (!rowNumber) {
      return NextResponse.json(
        { success: false, message: `Pessoa com email "${email}" não encontrada na planilha HORAISE` },
        { status: 404 }
      );
    }

    // Atualiza as colunas de horário (D em diante = coluna 4 em diante)
    // Dom7-8 começa na coluna D (índice 3)
    const range = `${SHEET_NAME}!D${rowNumber}:CN${rowNumber}`; // D até CN = 91 colunas (7 dias x 13 horas)

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: "RAW",
      requestBody: {
        values: [scheduleRow], // Array de uma linha
      },
    });

    return NextResponse.json({
      success: true,
      message: `✅ Schedule salvo na planilha HORAISE (linha ${rowNumber}) com sucesso!`,
    });
  } catch (error) {
    console.error("Erro ao salvar schedule:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
