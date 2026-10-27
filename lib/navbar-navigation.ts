import type { RolUsuario } from "@/lib/types";

export type DashboardNavItem = "discovery" | "profile";

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function resolveDashboardNavItem(
  pathname: string,
  role: RolUsuario
): DashboardNavItem | null {
  const profileRoute = role === "MUSICO"
    ? "/dashboard/musician"
    : "/dashboard/organizer";
  const discoveryRoute = role === "MUSICO" ? "/events" : "/projects";

  if (matchesRoute(pathname, profileRoute)) return "profile";
  if (matchesRoute(pathname, discoveryRoute)) return "discovery";
  return null;
}
