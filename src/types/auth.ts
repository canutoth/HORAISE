export type AuthRole = "admin" | "member";

export interface AuthSession {
  email: string;
  role: AuthRole;
}