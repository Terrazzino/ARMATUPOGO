import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-black text-neutral-400 border-t border-neutral-800 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-white mb-2">
            <Image src="/branding/arma-tu-pogo-logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
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
              <Link href="/projects" className="hover:text-red-400 transition-colors">
                Proyectos Musicales y Bandas
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-red-400 transition-colors">
                Publicar un Evento o Banda
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
