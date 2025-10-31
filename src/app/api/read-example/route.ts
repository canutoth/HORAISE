import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID ||
  process.env.GOOGLE_SHEETS_ID ||
  "";
const SHEET_NAME =
  process.env.SHEET_NAME || process.env.SHEET_NAME || "Team";

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

export async function GET() {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as any });

    function escapeSheetName(name: string) {
      if (!name) return name;
      return `'${name.replace(/'/g, "''")}'`;
    }

    const sheetRef = escapeSheetName(SHEET_NAME);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetRef}!A2:N2`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ message: "no example row" }, { status: 404 });
    }

    return NextResponse.json({ member: rows[0] });
  } catch (error) {
    console.error("read-example error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
