/**
 * Cliente de Supabase para navegador (Client Components)
 * Inicializa con credenciales públicas
 */

import { createBrowserClient } from "@supabase/ssr";

export const DEFAULT_SUPABASE_TIMEOUT_MS = 5000;

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Configuración de Supabase ausente en cliente: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const timeoutSignal = AbortSignal.timeout(DEFAULT_SUPABASE_TIMEOUT_MS);
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
        return fetch(input, {
          ...init,
          signal,
        });
      },
    },
  });
};