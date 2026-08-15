import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "horaise_oauth_state";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><title>Erro - HORAISE</title></head>
        <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9ff;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 500px;">
            <h1 style="color: #dc3545;">Erro de configuração</h1>
            <p style="color: #666;">Login do Google não configurado (GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI).</p>
            <a href="/horaise-admin" style="display: inline-block; margin-top: 20px; color: #0E1862;">Voltar ao login</a>
          </div>
        </body>
      </html>
      `,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const state = randomBytes(16).toString("hex");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
