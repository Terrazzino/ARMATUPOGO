import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { getPublicEvents } from "@/app/actions/events";
import { getPublicProjects } from "@/app/actions/projects";
import { EventCard } from "@/components/events/EventCard";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default async function Home() {
  const [featuredEvents, featuredProjects] = await Promise.all([
    getPublicEvents(),
    getPublicProjects(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <span>🔥</span>
            <span>Marketplace de Recitales y Bandas</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            ARMA TU <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">POGO</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
            Conectamos proyectos musicales independientes con organizadores de recitales y público. Formaliza contrataciones, negocia cachés y llena tus fechas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/events"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <span>📅</span>
              <span>Cartelera de Recitales</span>
            </Link>
            <Link
              href="/projects"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>🎸</span>
              <span>Directorio de Bandas</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Roles Feature Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            ¿Cómo funciona Arma tu pogo?
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Diseñado especialmente para la comunidad musical y organizadores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Músicos */}
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
                🎸
              </div>
              <h3 className="text-xl font-bold text-white">Músicos y Bandas</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Registra tus propuestas artísticas, indica tu caché orientativo, postúlate a fechas publicadas y negocia condiciones transparentes.
              </p>
            </div>
            <Link
              href="/auth/register"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Crear perfil de músico →
            </Link>
          </div>

          {/* Organizadores */}
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl">
                📋
              </div>
              <h3 className="text-xl font-bold text-white">Organizadores</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Publica tus convocatorias de recitales, recibe postulaciones de proyectos musicales, realiza ofertas y gestiona tu line-up.
              </p>
            </div>
            <Link
              href="/auth/register"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Publicar un recital →
            </Link>
          </div>

          {/* Público */}
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl">
                🎟️
              </div>
              <h3 className="text-xl font-bold text-white">Público</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Acceso libre y sin registro para descubrir fechas en vivo, escuchar la música de las bandas confirmadas y conocer salas.
              </p>
            </div>
            <Link
              href="/events"
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Explorar cartelera abierta →
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      {featuredEvents.length > 0 && (
        <section className="py-12 bg-slate-900/50 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Próximos Recitales</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fechas confirmadas en la plataforma</p>
              </div>
              <Link href="/events" className="text-xs font-bold text-blue-400 hover:underline">
                Ver todos ({featuredEvents.length}) →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Projects Section */}
      {featuredProjects.length > 0 && (
        <section className="py-12 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Bandas y Proyectos Destacados</h2>
                <p className="text-xs text-slate-400 mt-0.5">Artistas independientes registrados</p>
              </div>
              <Link href="/projects" className="text-xs font-bold text-purple-400 hover:underline">
                Ver catálogo ({featuredProjects.length}) →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProjects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}