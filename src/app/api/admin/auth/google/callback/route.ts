import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../../../../server/admin";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "../../../../../../server/session";

const OAUTH_STATE_COOKIE = "horaise_oauth_state";

function errorPage(title: string, message: string): NextResponse {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><title>Erro - HORAISE</title></head>
      <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9ff;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 500px;">
          <h1 style="color: #dc3545;">${title}</h1>
          <p style="color: #666;">${message}</p>
          <a href="/horaise-admin" style="display: inline-block; margin-top: 20px; color: #0E1862;">Voltar ao login</a>
        </div>
      </body>
    </html>
    `,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || state !== storedState) {
    return errorPage("Falha no login", "A autenticação com o Google foi cancelada ou é inválida. Tente novamente.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return errorPage("Erro de configuração", "Login do Google não configurado. Contate o administrador.");
  }

  // Troca o código de autorização por um token de acesso
  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch {
    return errorPage("Falha no login", "Não foi possível conectar ao Google. Tente novamente.");
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token;
  if (!accessToken) {
    return errorPage("Falha no login", "Não foi possível obter os dados do Google. Tente novamente.");
  }

  // Busca os dados do usuário autenticado
  let userInfo: { email?: string };
  try {
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    userInfo = await userInfoResponse.json();
  } catch {
    return errorPage("Falha no login", "Não foi possível validar sua conta Google. Tente novamente.");
  }

  const email = (userInfo.email || "").toLowerCase().trim();
  if (!email) {
    return errorPage("Falha no login", "Não foi possível obter o email da sua conta Google.");
  }

  // Verifica se o email pertence a um administrador (acesso de edição na planilha)
  let isAdmin = false;
  try {
    isAdmin = await isAdminEmail(email);
  } catch {
    return errorPage("Erro no login", "Não foi possível verificar seus privilégios de acesso. Tente novamente.");
  }
  if (!isAdmin) {
    return errorPage(
      "Acesso negado",
      `A conta <strong>${email}</strong> não possui acesso de administrador. Para se tornar admin, adicione o email como editor no compartilhamento da planilha.`
    );
  }

  const session = createAdminSession(email);
  const response = NextResponse.redirect(
    new URL("/horaise-admin/dashboard", request.url)
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
