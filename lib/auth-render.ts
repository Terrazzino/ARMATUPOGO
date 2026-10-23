import { cache } from "react";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { AuthenticationError } from "@/lib/errors";

/**
 * Identidad y perfil compartidos exclusivamente durante un render de React Server Components.
 * React invalida este memo por solicitud; no es un caché persistente ni se usa en Route Handlers.
 */
export const getAuthenticatedUserForRender = cache(() => getAuthenticatedUser());

/** Exige autenticación reutilizando la verificación segura del render actual. */
export const requireAuthenticatedUserForRender = cache(async () => {
  const user = await getAuthenticatedUserForRender();
  if (!user) throw new AuthenticationError();
  return user;
});
