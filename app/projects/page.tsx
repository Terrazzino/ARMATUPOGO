import { getPublicProjects } from "@/app/actions/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

interface ProjectsPageProps {
  searchParams: Promise<{ search?: string; genre?: string; city?: string }>;
}

export const metadata = {
  title: "Bandas y Proyectos Musicales - Arma tu pogo",
  description: "Descubre bandas, solistas y proyectos musicales independientes.",
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const projects = await getPublicProjects({
    search: params.search,
    genre: params.genre,
    city: params.city,
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Bandas y Proyectos Musicales
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-base">
            Conoce a los artistas independientes de la escena, escucha su música y contáctate para tus fechas.
          </p>
        </div>

        {/* Search / Filter Bar */}
        <form method="GET" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Buscar por nombre o descripción..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <input
              type="text"
              name="genre"
              defaultValue={params.genre || ""}
              placeholder="Género (Rock, Punk, Indie...)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <input
              type="text"
              name="city"
              defaultValue={params.city || ""}
              placeholder="Ciudad o zona..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Buscar
          </button>
        </form>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto mt-6">
            <span className="text-4xl mb-3 block">🎸</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No se encontraron bandas</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Prueba buscando por otro género o ciudad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}