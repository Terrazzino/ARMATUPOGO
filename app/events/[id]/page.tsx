import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import {
  getMusicianEventContext,
} from "@/app/actions/events";
import { EventParticipationPanel } from "@/components/events/EventParticipationPanel";
import { Footer } from "@/components/shared/Footer";
import { Navbar } from "@/components/shared/Navbar";
import { calcularCupos } from "@/lib/cupos";
import {
  getEventApplicationDisabledReason,
  getEventDetailNavigation,
  getEventTemporalState,
  hasEventFlyer,
} from "@/lib/event-detail";
import { getProjectOpportunityState } from "@/lib/musician-event-board";
import { getPublicEventDetailForRender } from "@/lib/public-detail-data";
import { formatTicketPrice, getTicketPriceInfo } from "@/lib/ticket-price";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await getPublicEventDetailForRender(id);
  if (!event) return { title: "Evento no encontrado - Arma tu pogo" };
  return {
    title: `${event.titulo} - Arma tu pogo`,
    description: event.descripcion || "Detalles del recital en Arma tu pogo",
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const [event, user] = await Promise.all([
    getPublicEventDetailForRender(id),
    getCurrentUser(),
  ]);

  if (!event) notFound();

  const musicianContext = user?.rol === "MUSICO"
    ? await getMusicianEventContext(event.id)
    : null;
  const capacity = calcularCupos({
    cantidadRequerida: event.cantidadMusicosRequerida,
    contrataciones: event.contrataciones,
  });
  const temporalState = getEventTemporalState({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  });
  const applicationDisabledReason = getEventApplicationDisabledReason({
    status: event.estado,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    confirmedCount: capacity.cuposOcupados,
    requiredCount: capacity.cuposTotales,
  });
  const projectsWithState = musicianContext?.projects.map((project) => ({
    ...project,
    state: getProjectOpportunityState({
      projectId: project.id,
      postulations: musicianContext.postulations,
      contracts: musicianContext.contracts,
    }),
  })) ?? [];

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const formattedDate = startsAt.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = startsAt.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endsAt.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const temporalLabel = temporalState === "PAST"
    ? "Finalizado"
    : temporalState === "ONGOING"
      ? "En curso"
      : "Publicado";
  const ticketPrice = formatTicketPrice(event.entradas);
  const isPaidTicket = getTicketPriceInfo(event.entradas).status === "PAID";
  const cache = event.cacheOfrecido && Number(event.cacheOfrecido.toString()) > 0
    ? `$${Number(event.cacheOfrecido.toString()).toLocaleString("es-AR")}`
    : null;

  return (
    <div className="atp-page flex min-h-screen flex-col">
      <Navbar {...getEventDetailNavigation(user?.rol ?? null)} />

      <main className="atp-container w-full flex-1 py-6 sm:py-8">
        <header className="grid gap-6 border-b border-neutral-800 pb-6 md:grid-cols-[minmax(14rem,19rem)_minmax(0,1fr)] md:items-center lg:gap-8">
          <div className="mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden border border-neutral-800 bg-neutral-900 md:mx-0">
            {hasEventFlyer(event.bannerUrl) ? (
              // Los flyers pueden provenir de hosts externos no configurados en Next Image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.bannerUrl!}
                alt={`Flyer de ${event.titulo}`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="event-flyer-placeholder h-full w-full" aria-label="Flyer no disponible">
                <span>FLYER NO DISPONIBLE</span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="atp-kicker">Fecha publicada</p>
              <span className="border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-neutral-300">
                {temporalLabel}
              </span>
            </div>
            <h1 className="atp-heading atp-page-title mt-3 break-words">
              {event.titulo}
            </h1>

            <dl className="mt-5 grid gap-3 border-l-2 border-red-600 pl-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="atp-label text-neutral-500">Fecha y horario</dt>
                <dd className="mt-1 font-bold capitalize text-neutral-100">
                  {formattedDate}
                </dd>
                <dd className="text-neutral-400">{startTime} a {endTime} hs</dd>
              </div>
              <div>
                <dt className="atp-label text-neutral-500">Establecimiento</dt>
                <dd className="mt-1 font-bold text-neutral-100">
                  {event.nombreLugar || "Lugar a confirmar"}
                </dd>
              </div>
              <div>
                <dt className="atp-label text-neutral-500">Dirección</dt>
                <dd className="mt-1 font-bold text-neutral-100">{event.ubicacion}</dd>
                {event.ciudad && <dd className="text-neutral-400">{event.ciudad}</dd>}
              </div>
              <div>
                <dt className="atp-label text-neutral-500">Organiza</dt>
                <dd className="mt-1 font-bold text-neutral-100">
                  {event.organizador.nombre} {event.organizador.apellido}
                </dd>
              </div>
              <div>
                <dt className="atp-label text-neutral-500">Entrada</dt>
                <dd className="mt-1 font-bold text-neutral-100">{ticketPrice}</dd>
                {isPaidTicket && (
                  <dd className="text-neutral-400">La compra de entradas todavía no está disponible.</dd>
                )}
              </div>
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-5xl space-y-8">
            <section className="border-b border-neutral-800 pb-8" aria-labelledby="event-description-title">
              <p className="atp-kicker">Sobre la fecha</p>
              <h2 id="event-description-title" className="atp-heading mt-1 text-2xl sm:text-[1.75rem]">
                Descripción del evento
              </h2>
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-neutral-300">
                {event.descripcion || "Sin descripción publicada."}
              </p>
            </section>

            <section className="border-b border-neutral-800 pb-8" aria-labelledby="event-lineup-title">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <p className="atp-kicker">Line-up</p>
                  <h2 id="event-lineup-title" className="atp-heading mt-1 text-2xl sm:text-[1.75rem]">
                    Bandas confirmadas
                  </h2>
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-300">
                  {capacity.cuposOcupados} de {capacity.cuposTotales} bandas confirmadas
                </p>
              </div>

              {event.contrataciones.length === 0 ? (
                <div className="atp-empty-state mt-5">
                  <h3 className="atp-heading text-2xl">Aún no hay bandas confirmadas</h3>
                  <p className="mt-2 text-sm text-neutral-400">
                    El line-up se actualizará cuando existan contrataciones acordadas.
                  </p>
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-neutral-800">
                  {event.contrataciones.map((contract) => (
                    <li
                      key={contract.proyectoMusical.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="atp-heading truncate text-2xl">
                          {contract.proyectoMusical.nombre}
                        </p>
                        <p className="mt-1 text-sm uppercase tracking-[0.08em] text-neutral-500">
                          {contract.proyectoMusical.genero}
                        </p>
                      </div>
                      <Link
                        href={`/projects/${contract.proyectoMusical.id}`}
                        className="atp-button atp-button-ghost min-h-9 shrink-0 px-3 text-sm"
                      >
                        Ver perfil público
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border-b border-neutral-800 pb-8" aria-labelledby="event-summary-title">
              <p className="atp-kicker">Información</p>
              <h2 id="event-summary-title" className="atp-heading mt-1 text-2xl sm:text-[1.75rem]">
                Resumen de la fecha
              </h2>
              <dl className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="py-3">
                  <dt className="atp-label text-neutral-500">Bandas confirmadas</dt>
                  <dd className="mt-1 text-lg font-bold text-neutral-100">
                    {capacity.cuposOcupados}
                  </dd>
                </div>
                {cache && (
                  <div className="py-3">
                    <dt className="atp-label text-neutral-500">Caché ofrecido</dt>
                    <dd className="mt-1 text-lg font-bold text-neutral-100">{cache}</dd>
                  </div>
                )}
                <div className="py-3">
                  <dt className="atp-label text-neutral-500">Estado</dt>
                  <dd className="mt-1 text-lg font-bold uppercase text-neutral-100">{temporalLabel}</dd>
                </div>
              </dl>
            </section>

            {user?.rol === "MUSICO" && musicianContext ? (
              <EventParticipationPanel
                eventId={event.id}
                eventTitle={event.titulo}
                projects={projectsWithState}
                disabledReason={applicationDisabledReason}
              />
            ) : (
              <section aria-labelledby="participation-title">
                <p className="atp-kicker">Estado personal</p>
                <h2 id="participation-title" className="atp-heading mt-1 text-2xl sm:text-[1.75rem]">
                  Tu participación
                </h2>
                {user?.rol === "ORGANIZADOR" ? (
              <div className="mt-4 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
                <p>Gestioná tus eventos y postulaciones desde tu panel de organizador.</p>
                <Link href="/dashboard/organizer" className="atp-button atp-button-secondary mt-3 text-sm">
                  Ir a mi perfil
                </Link>
              </div>
            ) : applicationDisabledReason ? (
              <p className="mt-4 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
                {applicationDisabledReason}
              </p>
            ) : (
              <div className="mt-4 border-l-2 border-neutral-700 pl-3">
                <p className="text-sm text-neutral-400">
                  ¿Tenés una banda y querés participar de esta fecha?
                </p>
                <Link href="/auth/login" className="atp-button atp-button-primary mt-4 text-sm">
                  Iniciar sesión para postularte
                </Link>
              </div>
                )}
              </section>
            )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
