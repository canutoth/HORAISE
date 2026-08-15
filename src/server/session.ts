import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "horaise_admin_session";

const SECRET = process.env.GOOGLE_CLIENT_SECRET || "dev-insecure-secret";

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

/**
 * Cria um valor de cookie de sessão assinado contendo o email do admin.
 * Formato: <payload base64url>.<assinatura hmac-sha256>
 */
export function createAdminSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, iat: Date.now() })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Lê e valida o cookie de sessão, retornando o email do admin ou null.
 */
export function readAdminSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.email === "string" && data.email ? data.email : null;
  } catch {
    return null;
  }
}

/**
 * Lê e valida o cookie de sessão a partir da requisição.
 */
export function getSessionEmail(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const value = match ? match.slice(ADMIN_SESSION_COOKIE.length + 1) : undefined;
  return readAdminSession(value);
}
