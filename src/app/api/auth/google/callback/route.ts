import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../../../server/admin";
import { readMemberByEmail } from "../../../../../server/sheets";
import {
  AUTH_SESSION_COOKIE,
  createAuthSession,
  isSafeInternalPath,
} from "../../../../../server/session";
import type { AuthRole } from "../../../../../types/auth";

const OAUTH_STATE_COOKIE = "horaise_oauth_state";
const OAUTH_REDIRECT_COOKIE = "horaise_oauth_redirect";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

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
          <a href="/login" style="display: inline-block; margin-top: 20px; color: #0E1862;">Voltar ao login</a>
        </div>
      </body>
    </html>
    `,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function clearOauthCookies(response: NextResponse) {
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_REDIRECT_COOKIE);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || state !== storedState) {
    return errorPage(
      "Falha no login",
      "A autenticação com o Google foi cancelada ou é inválida. Tente novamente."
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return errorPage(
      "Erro de configuração",
      "Login do Google não configurado. Contate o administrador."
    );
  }

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
    return errorPage(
      "Falha no login",
      "Não foi possível conectar ao Google. Tente novamente."
    );
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token;
  if (!accessToken) {
    return errorPage(
      "Falha no login",
      "Não foi possível obter os dados do Google. Tente novamente."
    );
  }

  let userInfo: {
    email?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
  } = {};
  try {
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    userInfo = await userInfoResponse.json();
  } catch {
    return errorPage(
      "Falha no login",
      "Não foi possível validar sua conta Google. Tente novamente."
    );
  }

  const email = (userInfo.email || "").toLowerCase().trim();
  if (!email) {
    return errorPage(
      "Falha no login",
      "Não foi possível obter o email da sua conta Google."
    );
  }

  // Se o fluxo pediu um redirect explícito (ex.: "voltar para o scheduler"),
  // ele tem prioridade sobre o destino padrão por papel.
  const requestedRedirect = request.cookies.get(OAUTH_REDIRECT_COOKIE)?.value;
  const explicitRedirect =
    requestedRedirect && isSafeInternalPath(requestedRedirect)
      ? requestedRedirect
      : null;

  let role: AuthRole;
  let destination: string;

  if (await isAdminEmail(email)) {
    role = "admin";
    destination = explicitRedirect || "/admin";
  } else if (await readMemberByEmail(email)) {
    role = "member";
    destination =
      explicitRedirect || `/edit-content/${encodeURIComponent(email)}`;
  } else {
    // Conta Google sem cadastro: encaminha para o registro pré-preenchido.
    const fullName =
      (userInfo.name || "").trim() ||
      [userInfo.given_name, userInfo.family_name]
        .map((part) => (part || "").trim())
        .filter(Boolean)
        .join(" ");
    const registerUrl = new URL("/register", request.url);
    registerUrl.searchParams.set("email", email);
    if (fullName) registerUrl.searchParams.set("nome", fullName);
    const response = NextResponse.redirect(registerUrl);
    clearOauthCookies(response);
    return response;
  }

  const session = createAuthSession(email, role);
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(AUTH_SESSION_COOKIE, session, SESSION_COOKIE_OPTIONS);
  clearOauthCookies(response);
  return response;
}