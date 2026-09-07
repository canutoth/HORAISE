import { createHmac, timingSafeEqual } from "crypto";
import type { AuthRole, AuthSession } from "@/types/auth";

export const AUTH_SESSION_COOKIE = "horaise_session";

const SECRET = process.env.GOOGLE_CLIENT_SECRET || "dev-insecure-secret";

const VALID_ROLES: AuthRole[] = ["admin", "member"];

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

/**
 * Cria um cookie de sessão assinado com o email e o papel do usuário.
 * Formato: <payload base64url>.<assinatura hmac-sha256>
 */
export function createAuthSession(email: string, role: AuthRole): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role, iat: Date.now() })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Lê e valida o valor do cookie de sessão, retornando { email, role } ou null.
 */
export function readAuthSession(cookieValue: string | undefined): AuthSession | null {
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
    if (
      typeof data.email === "string" &&
      data.email &&
      VALID_ROLES.includes(data.role)
    ) {
      return { email: data.email, role: data.role };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lê e valida a sessão a partir da requisição.
 */
export function getAuthSession(request: Request): AuthSession | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_SESSION_COOKIE}=`));
  const value = match ? match.slice(AUTH_SESSION_COOKIE.length + 1) : undefined;
  return readAuthSession(value);
}

/**
 * Valida se um caminho de redirect é interno (evita open redirects).
 * Aceita apenas caminhos que começam com "/" e não têm protocolo/backslash.
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (path.includes(":")) return false;
  return true;
}