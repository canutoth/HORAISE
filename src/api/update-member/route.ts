// API Route para atualizar o Google Sheets
// Este arquivo deve ser colocado em: app/api/update-member/route.ts (Next.js 13+)
// ou pages/api/update-member.ts (Next.js 12 e anteriores)

import { NextResponse } from "next/server";
import { google } from "googleapis";

// Tipos
interface TeamMemberData {
  name: string;
  position: string;
  imageUrl: string;
  description: string;
  email: string;
  researchInterests: string[];
  technologies: string[];
  expertise: string[];
  socialLinks?: {
    lattes?: string;
    personalWebsite?: string;
    linkedin?: string;
    github?: string;
    googleScholar?: string;
    orcid?: string;
  };
}

interface RequestBody {
  member: TeamMemberData;
  isNew: boolean;
}

// Configuração do Google Sheets
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
const SHEET_NAME = process.env.SHEET_NAME || "Team";

// Credenciais OAuth2
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

// Converte array para string separada por vírgula
const arrayToString = (arr: string[]): string => {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
};

// Converte string separada por vírgula para array
const stringToArray = (str: string): string[] => {
  if (!str || str.trim() === "") return [];
  return str
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// Converte objeto TeamMemberData para linha do Google Sheets
const teamMemberToRow = (member: TeamMemberData): string[] => {
  return [
    member.name,
    member.position,
    member.imageUrl,
    member.description,
    member.email,
    arrayToString(member.researchInterests),
    arrayToString(member.technologies),
    arrayToString(member.expertise),
    member.socialLinks?.lattes || "",
    member.socialLinks?.personalWebsite || "",
    member.socialLinks?.linkedin || "",
    member.socialLinks?.github || "",
    member.socialLinks?.googleScholar || "",
    member.socialLinks?.orcid || "",
  ];
};

// Autenticação com Google Sheets
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return await auth.getClient();
}

// Encontra a linha do membro pelo email
async function findMemberRow(
  sheets: any,
  email: string
): Promise<number | null> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:N`,
  });

  const rows = response.data.values || [];

  // Pula header (linha 1) e exemplo (linha 2)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (row[4] && row[4].toLowerCase() === email.toLowerCase()) {
      return i + 1; // Retorna número da linha (1-indexed)
    }
  }

  return null;
}

// Handler POST
export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { member, isNew } = body;

    // Validações
    if (!member || !member.email) {
      return NextResponse.json(
        { success: false, message: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Não permite salvar o email de exemplo
    if (member.email === "exemplo@example.com") {
      return NextResponse.json(
        {
          success: false,
          message: "Não é possível salvar dados de exemplo",
        },
        { status: 400 }
      );
    }

    // Autenticação
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as any });

    // Converte membro para linha
    const rowData = teamMemberToRow(member);

    if (isNew) {
      // Adiciona nova linha no final
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:N`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });

      return NextResponse.json({
        success: true,
        message: "Novo membro adicionado com sucesso",
      });
    } else {
      // Atualiza linha existente
      const rowNumber = await findMemberRow(sheets, member.email);

      if (!rowNumber) {
        return NextResponse.json(
          {
            success: false,
            message: "Membro não encontrado para atualização",
          },
          { status: 404 }
        );
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });

      return NextResponse.json({
        success: true,
        message: "Membro atualizado com sucesso",
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar Google Sheets:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

// Handler GET (opcional - para teste)
export async function GET() {
  return NextResponse.json({
    message: "API de atualização do Google Sheets está funcionando",
  });
}
