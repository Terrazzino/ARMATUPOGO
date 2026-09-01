import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/actions/auth";
import { getMyProjects } from "@/app/actions/projects";
import { getMyContracts } from "@/app/actions/contracts";
import { getUserReputation } from "@/app/actions/ratings";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { NegotiationCard } from "@/components/contracts/NegotiationCard";
import { RatingModal } from "@/components/ratings/RatingModal";

export const metadata = {
  title: "Panel de Músico - Arma tu pogo",
  description: "Administra tus proyectos musicales y negociaciones de recitales",
};

export default async function MusicianDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.rol !== "MUSICO") {
    redirect("/dashboard/organizer");
  }

  const [projects, contracts, reputation] = await Promise.all([
    getMyProjects(),
    getMyContracts(),
    getUserReputation(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-8 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
              Panel de Músico
            </span>
            <h1 className="text-3xl font-black mt-1">
              Hola, {user.nombre} {user.apellido}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {user.email} • {projects.length} {projects.length === 1 ? "proyecto registrado" : "proyectos registrados"}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs text-blue-200 block font-semibold">Reputación</span>
              <span className="text-2xl font-black text-amber-300">
                ★ {reputation.averageScore > 0 ? reputation.averageScore : "—"}
              </span>
            </div>
            <div className="border-l border-white/20 pl-4 text-xs text-slate-300">
              {reputation.total} {reputation.total === 1 ? "valoración" : "valoraciones"}
            </div>
          </div>
        </div>

        {/* Section 1: My Projects */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Mis Proyectos Musicales</h2>
              <p className="text-xs text-slate-500">Administra las bandas y propuestas artísticas de tu cuenta</p>
            </div>
            <CreateProjectModal />
          </div>

          {projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto">
              <span className="text-4xl block mb-2">🎸</span>
              <h3 className="font-bold text-base">Aún no registraste ninguna banda</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Crea tu primer proyecto musical para poder postularte a las fechas disponibles.
              </p>
              <CreateProjectModal />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded uppercase">
                        {project.genero}
                      </span>
                      <span className={`text-xs font-semibold ${project.estaActivo ? "text-emerald-600" : "text-slate-400"}`}>
                        {project.estaActivo ? "● Activo" : "○ Inactivo"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold truncate">{project.nombre}</h3>

                    {project.descripcion && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {project.descripcion}
                      </p>
                    )}

                    {project.cacheAproximado && Number(project.cacheAproximado.toString()) > 0 && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Caché orientativo: ${Number(project.cacheAproximado.toString()).toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver Perfil Público →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: My Negotiations and Contracts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mis Negociaciones y Contrataciones</h2>
              <p className="text-xs text-slate-500">
                Estado de tus postulaciones, ofertas económicas vigentes y acuerdos cerrados
              </p>
            </div>
            <Link
              href="/events"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Explorar Cartelera de Recitales →
            </Link>
          </div>

          {contracts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto">
              <span className="text-4xl block mb-2">📋</span>
              <h3 className="font-bold text-base">No tienes negociaciones activas</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Busca eventos en la cartelera y postula tu banda para empezar a negociar.
              </p>
              <Link
                href="/events"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Ver Cartelera
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="space-y-2">
                  <NegotiationCard
                    contract={contract}
                    currentUserId={user.id}
                  />
                  {contract.estado === "ACORDADO" && (
                    <div className="flex justify-end pr-2">
                      <RatingModal
                        contractId={contract.id}
                        targetName={`${contract.organizador.nombre} ${contract.organizador.apellido}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}