import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID ||
  "";
const SHEET_NAME =
  process.env.SHEET_NAME || process.env.NEXT_PUBLIC_SHEET_NAME || "Team";

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return await auth.getClient();
}

function escapeSheetName(name: string) {
  // escape single quotes by doubling them, then wrap in single quotes
  if (!name) return name;
  const escaped = name.replace(/'/g, "''");
  return `'${escaped}'`;
}

async function findMemberByEmail(sheets: any, email: string) {
  const sheetRef = escapeSheetName(SHEET_NAME);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetRef}!A:N`,
  });
  const rows = response.data.values || [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (row[4] && row[4].toLowerCase() === email.toLowerCase()) {
      return { row, rowNumber: i + 1 };
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as any });

    const found = await findMemberByEmail(sheets, email);
    if (!found)
      return NextResponse.json({ message: "not found" }, { status: 404 });

    return NextResponse.json({ member: found.row, rowNumber: found.rowNumber });
  } catch (error) {
    console.error("read-member error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
