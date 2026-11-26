"use client";

import { useEffect, useState } from "react";
import type { AuthSession } from "@/types/auth";

/**
 * Busca a sessão atual via /api/auth/session.
 * Retorna null quando não há sessão válida ou houve erro de rede.
 */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) return null;
    return (await response.json()) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Hook que expõe a sessão atual (email + papel) para componentes clientes.
 */
export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession().then((result) => {
      if (cancelled) return;
      setSession(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loading };
}