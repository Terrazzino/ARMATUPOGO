import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/actions/auth";
import { getMyEvents } from "@/app/actions/events";
import { getMyContracts } from "@/app/actions/contracts";
import { getUserReputation } from "@/app/actions/ratings";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { NegotiationCard } from "@/components/contracts/NegotiationCard";
import { RatingModal } from "@/components/ratings/RatingModal";

export const metadata = {
  title: "Panel de Organizador - Arma tu pogo",
  description: "Administra tus eventos, fechas y contrataciones de bandas",
};

export default async function OrganizerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.rol !== "ORGANIZADOR") {
    redirect("/dashboard/musician");
  }

  const [events, contracts, reputation] = await Promise.all([
    getMyEvents(),
    getMyContracts(),
    getUserReputation(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-950 text-white rounded-3xl p-8 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
              Panel de Organizador
            </span>
            <h1 className="text-3xl font-black mt-1">
              Hola, {user.nombre} {user.apellido}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {user.email} • {events.length} {events.length === 1 ? "evento publicado" : "eventos publicados"}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs text-indigo-200 block font-semibold">Reputación</span>
              <span className="text-2xl font-black text-amber-300">
                ★ {reputation.averageScore > 0 ? reputation.averageScore : "—"}
              </span>
            </div>
            <div className="border-l border-white/20 pl-4 text-xs text-slate-300">
              {reputation.total} {reputation.total === 1 ? "valoración" : "valoraciones"}
            </div>
          </div>
        </div>

        {/* Section 1: My Events */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Mis Eventos y Recitales</h2>
              <p className="text-xs text-slate-500">Publica fechas, administra cupos de bandas y revisa convocatorias</p>
            </div>
            <CreateEventModal />
          </div>

          {events.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto">
              <span className="text-4xl block mb-2">📅</span>
              <h3 className="font-bold text-base">Aún no publicaste ningún evento</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Publica tu primera fecha para recibir postulaciones de bandas y solistas.
              </p>
              <CreateEventModal />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const confirmedBands = event.contrataciones.filter((c) => c.estado === "ACORDADO").length;
                return (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(event.fechaEvento).toLocaleDateString("es-AR")}
                        </span>
                        <StatusBadge status={event.estado} />
                      </div>

                      <h3 className="text-lg font-bold truncate">{event.titulo}</h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <span>📍</span> {event.nombreLugar ? `${event.nombreLugar}, ` : ""}{event.ubicacion}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">Cupos cubiertos:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-200">
                          {confirmedBands} / {event.cantidadMusicosRequerida} bandas
                        </span>
                      </div>

                      {event.cacheOfrecido && Number(event.cacheOfrecido.toString()) > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Caché ofrecido:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ${Number(event.cacheOfrecido.toString()).toLocaleString("es-AR")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <Link
                        href={`/events/${event.id}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Ver Ficha Pública →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Applications & Negotiations */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Postulaciones y Negociaciones Activas</h2>
              <p className="text-xs text-slate-500">
                Gestiona las propuestas económicas recibidas de bandas y envía contraofertas
              </p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Buscar Bandas y Solistas →
            </Link>
          </div>

          {contracts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto">
              <span className="text-4xl block mb-2">✉️</span>
              <h3 className="font-bold text-base">No hay postulaciones recibidas</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                También puedes buscar proyectos musicales en el catálogo e invitarlos directamente a tus fechas.
              </p>
              <Link
                href="/projects"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Buscar Bandas
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
                        targetName={contract.proyectoMusical.nombre}
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