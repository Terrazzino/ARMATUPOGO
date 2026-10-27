"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { resolveDashboardNavItem } from "@/lib/navbar-navigation";
import type { RolUsuario } from "@/lib/types";

interface DashboardNavigationProps {
  role: RolUsuario;
}

export function DashboardNavigation({ role }: DashboardNavigationProps) {
  const pathname = usePathname();
  const activeItem = resolveDashboardNavItem(pathname, role);
  const dashboardHref = role === "MUSICO" ? "/dashboard/musician" : "/dashboard/organizer";
  const discoveryHref = role === "MUSICO" ? "/events" : "/projects";
  const discoveryLabel = role === "MUSICO" ? "Buscar Fechas" : "Buscar Bandas";
  const linkClassName = (active: boolean) =>
    `atp-button min-h-9 whitespace-nowrap px-2.5 text-xs sm:px-3 sm:text-sm ${
      active ? "atp-button-primary" : "atp-button-ghost"
    }`;

  return (
    <nav aria-label="Navegación del panel" className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Link
        href={discoveryHref}
        aria-current={activeItem === "discovery" ? "page" : undefined}
        className={linkClassName(activeItem === "discovery")}
      >
        {discoveryLabel}
      </Link>
      <Link
        href={dashboardHref}
        aria-current={activeItem === "profile" ? "page" : undefined}
        className={linkClassName(activeItem === "profile")}
      >
        Mi Perfil
      </Link>
      <LogoutButton variant="dashboard" />
    </nav>
  );
}
