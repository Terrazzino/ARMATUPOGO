import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/app/actions/events";
import { getCurrentUser } from "@/app/actions/auth";
import { getMyProjects } from "@/app/actions/projects";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApplyModal } from "@/components/contracts/ApplyModal";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Evento no encontrado - Arma tu pogo" };
  return {
    title: `${event.titulo} - Arma tu pogo`,
    description: event.descripcion || "Detalles del recital en Arma tu pogo",
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const [event, user] = await Promise.all([
    getEventById(id),
    getCurrentUser(),
  ]);

  if (!event) {
    notFound();
  }

  const musicianProjects = user?.rol === "MUSICO" ? await getMyProjects() : [];

  const dateObj = new Date(event.fechaEvento);
  const formattedDate = dateObj.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/events" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
            ← Volver a la cartelera
          </Link>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <span className="text-xs sm:text-sm uppercase tracking-wider font-bold text-blue-300">
                📅 {formattedDate} • {formattedTime} hs
              </span>
              <StatusBadge status={event.estado} />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              {event.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-1.5">
                <span>📍</span>
                <span>{event.nombreLugar ? `${event.nombreLugar}, ` : ""}{event.ubicacion}{event.ciudad ? ` (${event.ciudad})` : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>👤</span>
                <span>Organizado por {event.organizador.nombre} {event.organizador.apellido}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Acerca de esta fecha</h2>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {event.descripcion || "Sin descripción proporcionada."}
              </p>
            </div>

            {/* Confirmed Lineup */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Line-up de Bandas Confirmadas</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {event.contrataciones.length} de {event.cantidadMusicosRequerida} cupos cubiertos
                  </p>
                </div>
              </div>

              {event.contrataciones.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <span className="text-3xl block mb-2">🥁</span>
                  <p className="text-sm font-semibold">Aún no hay bandas confirmadas</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las postulaciones están abiertas para músicos y bandas independientes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.contrataciones.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded uppercase">
                          {c.proyectoMusical.genero}
                        </span>
                        <h4 className="text-base font-bold mt-1.5">{c.proyectoMusical.nombre}</h4>
                      </div>

                      <Link
                        href={`/projects/${c.proyectoMusical.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Ver Perfil y Redes →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Application Action */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-lg font-bold">Resumen de la Fecha</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Cupos de bandas:</span>
                  <span className="font-semibold">{event.cantidadMusicosRequerida}</span>
                </div>
                {event.cacheOfrecido && Number(event.cacheOfrecido.toString()) > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Caché ofrecido:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(event.cacheOfrecido.toString()).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Estado:</span>
                  <StatusBadge status={event.estado} />
                </div>
              </div>

              {/* Action Box according to auth & role */}
              <div className="pt-2">
                {user ? (
                  user.rol === "MUSICO" ? (
                    <ApplyModal
                      eventId={event.id}
                      eventTitle={event.titulo}
                      projects={musicianProjects}
                    />
                  ) : (
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 text-center">
                      Eres organizador. Puedes gestionar tus fechas desde tu panel.
                    </div>
                  )
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-500">
                      ¿Tienes una banda y quieres tocar en este recital?
                    </p>
                    <a
                      href="/auth/login"
                      className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors text-center"
                    >
                      Inicia Sesión para Postularte
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