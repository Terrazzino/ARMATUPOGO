import { getPublicProjects } from "@/app/actions/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";

interface ProjectsPageProps {
  searchParams: Promise<{ search?: string; genre?: string; city?: string }>;
}

export const metadata = {
  title: "Bandas y Proyectos Musicales - Arma tu pogo",
  description: "Descubre bandas, solistas y proyectos musicales independientes.",
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const projects = await getPublicProjects({
    search: params.search,
    genre: params.genre,
    city: params.city,
  });

  return (
    <div className="atp-page flex min-h-screen flex-col">
      <Navbar variant={user?.rol === "ORGANIZADOR" ? "dashboard" : "public"} />

      <main className="atp-container w-full flex-1 py-6 sm:py-8">
        <header className="border-b border-neutral-800 pb-5">
          <p className="atp-kicker">La escena independiente</p>
          <h1 className="atp-heading atp-page-title mt-2">Buscar Bandas</h1>
          <p className="mt-2 max-w-2xl text-base text-neutral-400 sm:text-lg">
            Descubrí proyectos musicales y encontrá artistas para tus próximas fechas.
          </p>
        </header>

        <form method="GET" className="grid gap-3 border-b border-neutral-800 py-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto] lg:items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="projects-search" className="atp-label mb-1.5 block">Nombre o descripción</label>
            <input
              id="projects-search"
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Buscar por nombre o descripción..."
              className="atp-field"
            />
          </div>
          <div>
            <label htmlFor="projects-genre" className="atp-label mb-1.5 block">Género musical</label>
            <input
              id="projects-genre"
              type="text"
              name="genre"
              defaultValue={params.genre || ""}
              placeholder="Rock, punk, indie..."
              className="atp-field"
            />
          </div>
          <div>
            <label htmlFor="projects-city" className="atp-label mb-1.5 block">Ciudad</label>
            <input
              id="projects-city"
              type="text"
              name="city"
              defaultValue={params.city || ""}
              placeholder="Ciudad..."
              className="atp-field"
            />
          </div>
          <button
            type="submit"
            className="atp-button atp-button-primary px-6 text-sm"
          >
            Buscar
          </button>
        </form>

        {projects.length === 0 ? (
          <div className="atp-empty-state mx-auto mt-6 max-w-lg py-10">
            <h2 className="atp-heading text-2xl">No se encontraron bandas</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Probá buscando por otro género o ciudad.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid auto-rows-fr grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
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
