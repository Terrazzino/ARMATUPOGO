import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface NavbarProps {
  variant?: "public" | "dashboard";
  activeItem?: "discovery" | "profile" | null;
}

export async function Navbar({ variant = "public", activeItem }: NavbarProps) {
  const user = await getCurrentUser();
  const showDashboardNavigation = variant === "dashboard" && Boolean(user);
  const currentItem = activeItem === undefined && showDashboardNavigation
    ? "profile"
    : activeItem;
  const dashboardHref = user?.rol === "MUSICO" ? "/dashboard/musician" : "/dashboard/organizer";
  const discoveryHref = user?.rol === "MUSICO" ? "/events" : "/projects";
  const discoveryLabel = user?.rol === "MUSICO" ? "Buscar Fechas" : "Buscar Bandas";

  return (
    <header className="bg-black/95 text-white border-b border-neutral-800 sticky top-0 z-30 shadow-lg shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Arma tu pogo - Inicio" className="flex items-center gap-2 text-xl font-black tracking-wider text-white hover:text-red-400 transition-colors">
          <Image src="/branding/arma-tu-pogo-logo.optimized.webp" alt="" aria-hidden="true" width={48} height={48} className="h-12 w-12 object-contain" loading="eager" />
          <span className="hidden sm:inline" aria-hidden="true">ARMA TU POGO</span>
        </Link>

        {!showDashboardNavigation && (
          <p className="hidden text-sm font-medium text-neutral-400 md:block">
            ¿Tenés una banda o armás recitales?
          </p>
        )}

        {/* Auth / Dashboard Controls */}
        <div className="flex min-w-0 items-center gap-3">
          {user ? (
            showDashboardNavigation ? (
              <nav aria-label="Navegación del panel" className="flex min-w-0 items-center gap-1 sm:gap-2">
                <Link
                  href={discoveryHref}
                  aria-current={currentItem === "discovery" ? "page" : undefined}
                  className="atp-button atp-button-primary min-h-9 whitespace-nowrap px-2.5 text-xs sm:px-3 sm:text-sm"
                >
                  {discoveryLabel}
                </Link>
                <Link
                  href={dashboardHref}
                  aria-current={currentItem === "profile" ? "page" : undefined}
                  className="atp-button atp-button-ghost min-h-9 whitespace-nowrap px-2.5 text-xs sm:px-3 sm:text-sm"
                >
                  Mi Perfil
                </Link>
                <LogoutButton variant="dashboard" />
              </nav>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardHref}
                  className="text-sm font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>Mi Panel ({user.rol === "MUSICO" ? "Músico" : "Organizador"})</span>
                </Link>
                <LogoutButton />
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-sm font-medium px-3.5 py-1.5 text-neutral-300 hover:text-white transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-medium px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
