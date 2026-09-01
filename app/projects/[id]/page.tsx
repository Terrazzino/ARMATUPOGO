import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectById } from "@/app/actions/projects";
import { getProjectReputation } from "@/app/actions/ratings";
import { getMyEvents } from "@/app/actions/events";
import { getCurrentUser } from "@/app/actions/auth";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { InviteModal } from "@/components/contracts/InviteModal";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return { title: "Proyecto no encontrado - Arma tu pogo" };
  return {
    title: `${project.nombre} (${project.genero}) - Arma tu pogo`,
    description: project.descripcion || `Perfil de ${project.nombre} en Arma tu pogo`,
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const [project, reputation, user] = await Promise.all([
    getProjectById(id),
    getProjectReputation(id),
    getCurrentUser(),
  ]);

  if (!project) {
    notFound();
  }

  const organizerEvents = user?.rol === "ORGANIZADOR" ? await getMyEvents() : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/projects" className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1">
            ← Volver al catálogo de bandas
          </Link>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-purple-800 border-2 border-white/20 flex items-center justify-center text-4xl sm:text-5xl font-black uppercase shrink-0 shadow-lg">
              {project.nombre.charAt(0)}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold px-2.5 py-1 bg-purple-500/30 border border-purple-400/30 text-purple-200 rounded-lg uppercase tracking-wider">
                  {project.genero}
                </span>
                {reputation.total > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg flex items-center gap-1">
                    ★ {reputation.averageScore} ({reputation.total} valoraciones)
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
                {project.nombre}
              </h1>

              {project.ciudad && (
                <p className="text-sm text-slate-300 flex items-center gap-1">
                  <span>📍</span> {project.ciudad}{project.ubicacion ? ` - ${project.ubicacion}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Biografía y Propuesta</h2>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {project.descripcion || "Sin descripción proporcionada."}
              </p>
            </div>

            {/* Reviews & Ratings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Historial de Valoraciones</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluaciones de organizadores con los que ha compartido fecha
                  </p>
                </div>
              </div>

              {reputation.ratings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <span className="text-3xl block mb-2">⭐</span>
                  <p className="text-sm font-semibold">Aún no posee valoraciones</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las valoraciones se generan tras completar fechas acordadas en la plataforma.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reputation.ratings.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-500">
                          {"★".repeat(r.puntaje)}{"☆".repeat(5 - r.puntaje)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(r.creadoEn).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      {r.comentario && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                          &ldquo;{r.comentario}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-slate-500 font-medium">
                        — Por {r.autor.nombre} {r.autor.apellido}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Links & Invitation */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-lg font-bold">Datos del Proyecto</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Género:</span>
                  <span className="font-semibold">{project.genero}</span>
                </div>
                {project.cacheAproximado && Number(project.cacheAproximado.toString()) > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Caché orientativo:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(project.cacheAproximado.toString()).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
              </div>

              {/* Music & Social Links */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Plataformas y Redes
                </span>
                <div className="flex flex-col gap-2 text-sm font-semibold">
                  {project.spotifyUrl && (
                    <a
                      href={project.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors flex items-center gap-2"
                    >
                      <span>🟢</span> Escuchar en Spotify
                    </a>
                  )}
                  {project.youtubeUrl && (
                    <a
                      href={project.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <span>🔴</span> Ver en YouTube
                    </a>
                  )}
                  {project.instagramUrl && (
                    <a
                      href={project.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-100 transition-colors flex items-center gap-2"
                    >
                      <span>📷</span> Seguir en Instagram
                    </a>
                  )}
                  {project.sitioWebUrl && (
                    <a
                      href={project.sitioWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      <span>🌐</span> Sitio Oficial / Linktree
                    </a>
                  )}
                </div>
              </div>

              {/* Organizer Invite Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  user.rol === "ORGANIZADOR" ? (
                    <InviteModal
                      projectId={project.id}
                      projectName={project.nombre}
                      events={organizerEvents}
                    />
                  ) : (
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 text-center">
                      Eres músico. Puedes gestionar tus propios proyectos desde tu panel.
                    </div>
                  )
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-500">
                      ¿Eres organizador y te interesa esta banda para tu recital?
                    </p>
                    <a
                      href="/auth/login"
                      className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors text-center"
                    >
                      Inicia Sesión para Invitar
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}