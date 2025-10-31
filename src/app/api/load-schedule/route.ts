import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID_INFO || "";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "email é obrigatório" },
        { status: 400 }
      );
    }

    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { message: "ID da planilha HORAISE não configurado" },
        { status: 500 }
      );
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    // Encontra a linha da pessoa
    const rowNumber = await findRowByEmail(sheets, email);
    
    if (!rowNumber) {
      return NextResponse.json(
        { message: `Pessoa com email "${email}" não encontrada na planilha HORAISE` },
        { status: 404 }
      );
    }

    // Lê as colunas de horário (D em diante = coluna 4 em diante)
    const range = `${SHEET_NAME}!D${rowNumber}:CN${rowNumber}`; // D até CN = 91 colunas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const scheduleRow = response.data.values?.[0] || [];

    return NextResponse.json({
      scheduleRow,
    });
  } catch (error) {
    console.error("Erro ao carregar schedule:", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
