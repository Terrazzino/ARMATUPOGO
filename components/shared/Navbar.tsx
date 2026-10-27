import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardNavigation } from "@/components/shared/DashboardNavigation";

interface NavbarProps {
  variant?: "public" | "dashboard";
}

export async function Navbar({ variant = "public" }: NavbarProps) {
  const user = await getCurrentUser();
  const showDashboardNavigation = variant === "dashboard" && Boolean(user);
  const dashboardHref = user?.rol === "MUSICO" ? "/dashboard/musician" : "/dashboard/organizer";

  return (
    <header className="bg-black/95 text-white border-b border-neutral-800 sticky top-0 z-30 shadow-lg shadow-black/30">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Arma tu pogo - Inicio" className="flex items-center gap-2 text-xl font-black tracking-wider text-white hover:text-red-400 transition-colors">
          <Image src="/branding/arma-tu-pogo-logo.optimized.webp" alt="" aria-hidden="true" width={40} height={40} className="h-10 w-10 object-contain" loading="eager" />
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
              <DashboardNavigation role={user.rol} />
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardHref}
                  className="flex min-h-10 items-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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
                className="inline-flex min-h-10 items-center px-3 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
              >
                Ingresar
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex min-h-10 items-center rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
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
