/**
 * Cliente de Supabase para Server Components y Server Actions
 * Maneja sesiones automáticamente usando cookies
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const DEFAULT_SUPABASE_TIMEOUT_MS = 5000;

export const createClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // This exception is expected control flow when `createClient` is
          // called from a Server Component.
        }
      },
    },
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