import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-white mb-2">
            <span>🎸</span>
            <span>ARMA TU POGO</span>
          </div>
          <p className="text-sm text-slate-400 max-w-sm">
            El marketplace de música independiente para conectar bandas, organizadores de recitales y público.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
            Explorar
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/events" className="hover:text-white transition-colors">
                Cartelera de Recitales
              </Link>
            </li>
            <li>
              <Link href="/projects" className="hover:text-white transition-colors">
                Proyectos Musicales y Bandas
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-white transition-colors">
                Publicar un Evento o Banda
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
            Arma tu pogo
          </h3>
          <p className="text-sm text-slate-400">
            Plataforma web académica para Metodologías de Desarrollo Web.
          </p>
          <div className="mt-3 text-xs text-slate-500">
            © {new Date().getFullYear()} Arma tu pogo. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
