import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-800 bg-black py-8 text-neutral-400">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
            <Image src="/branding/arma-tu-pogo-logo.optimized.webp" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span>ARMA TU POGO</span>
          </div>
          <p className="text-sm text-neutral-400 max-w-sm">
            El marketplace de música independiente para conectar bandas, organizadores de recitales y público.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
            Explorar
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/events" className="hover:text-red-400 transition-colors">
                Cartelera de Recitales
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-red-400 transition-colors">
                Ingresar o registrarse
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
            Arma tu pogo
          </h3>
          <p className="text-sm text-neutral-400">
            Plataforma web académica para Metodologías de Desarrollo Web.
          </p>
          <div className="mt-3 text-xs text-neutral-600">
            © {new Date().getFullYear()} Arma tu pogo. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
