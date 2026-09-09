import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/app/actions/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="bg-black/95 text-white border-b border-neutral-800 sticky top-0 z-30 shadow-lg shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Arma tu pogo - Inicio" className="flex items-center gap-2 text-xl font-black tracking-wider text-white hover:text-red-400 transition-colors">
          <Image src="/branding/arma-tu-pogo-logo.png" alt="" aria-hidden="true" width={48} height={48} className="h-12 w-12 object-contain" priority />
          <span className="hidden sm:inline" aria-hidden="true">ARMA TU POGO</span>
        </Link>

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/events" className="text-neutral-300 hover:text-red-400 transition-colors">
            Cartelera de Eventos
          </Link>
          <Link href="/projects" className="text-neutral-300 hover:text-red-400 transition-colors">
            Bandas y Solistas
          </Link>
        </nav>

        {/* Auth / Dashboard Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={user.rol === "MUSICO" ? "/dashboard/musician" : "/dashboard/organizer"}
                className="text-sm font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Mi Panel ({user.rol === "MUSICO" ? "Músico" : "Organizador"})</span>
              </Link>
              <LogoutButton />
            </div>
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