import Link from "next/link";
import { DeferredApplyToEventModal } from "@/components/events/DeferredApplyToEventModal";
import {
  getEventOpportunityState,
  getProjectOpportunityState,
  musicianOpportunityLabels,
} from "@/lib/musician-event-board";
import type { EstadoContratacion, EstadoPostulacion } from "@/lib/types";

interface MusicianEventCardProps {
  event: {
    id: string;
    titulo: string;
    startsAt: Date | string;
    endsAt: Date | string;
    ubicacion: string;
    nombreLugar: string | null;
    ciudad: string | null;
    bannerUrl: string | null;
    cacheOfrecido: number | string | { toString(): string } | null;
    cantidadMusicosRequerida: number;
    confirmedCount: number;
    hasStarted: boolean;
    postulations: Array<{
      proyectoMusicalId: string;
      estado: EstadoPostulacion;
    }>;
    contracts: Array<{
      proyectoMusicalId: string;
      estado: EstadoContratacion;
    }>;
  };
  projects: Array<{ id: string; nombre: string }>;
  prioritizeImage?: boolean;
}

function formatMoney(value: MusicianEventCardProps["event"]["cacheOfrecido"]) {
  if (value === null) return null;
  const amount = Number(value.toString());
  return Number.isFinite(amount) ? `$${amount.toLocaleString("es-AR")}` : null;
}

export function MusicianEventCard({
  event,
  projects,
  prioritizeImage = false,
}: MusicianEventCardProps) {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const date = startsAt.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startTime = startsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const endTime = endsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const cache = formatMoney(event.cacheOfrecido);
  const eventState = getEventOpportunityState({
    postulations: event.postulations,
    contracts: event.contracts,
  });
  const isFull = event.confirmedCount >= event.cantidadMusicosRequerida;
  const projectsWithState = projects.map((project) => ({
    ...project,
    state: getProjectOpportunityState({
      projectId: project.id,
      postulations: event.postulations,
      contracts: event.contracts,
    }),
  }));
  const disabledReason = event.hasStarted
    ? "Este evento ya comenzó y no acepta postulaciones."
    : isFull
      ? "La convocatoria ya completó sus cupos confirmados."
      : undefined;
  const opportunityLabel = eventState === "DISPONIBLE" && event.hasStarted
    ? "Evento iniciado"
    : eventState === "DISPONIBLE" && isFull
      ? "Convocatoria completa"
      : musicianOpportunityLabels[eventState];

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden border border-neutral-800 bg-neutral-950 transition-colors hover:border-neutral-600">
      <Link
        href={`/events/${event.id}`}
        aria-label={`Ver detalles de ${event.titulo}`}
        className="relative block aspect-[4/5] overflow-hidden bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
      >
        {event.bannerUrl ? (
          // Las URLs de flyers son externas y no tienen un host único configurable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.bannerUrl}
            alt={`Flyer de ${event.titulo}`}
            loading={prioritizeImage ? "eager" : "lazy"}
            fetchPriority={prioritizeImage ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="event-flyer-placeholder h-full w-full" aria-hidden="true">
            <span>FLYER NO DISPONIBLE</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400">
            {date} - {startTime} a {endTime} hs
          </p>
          <span className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-neutral-300">
            {opportunityLabel}
          </span>
        </div>

        <h2 className="atp-heading mt-1.5 text-xl">
          <Link href={`/events/${event.id}`} className="hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            {event.titulo}
          </Link>
        </h2>

        <dl className="mt-3 space-y-2 border-t border-neutral-800 pt-2.5 text-sm">
          <div>
            <dt className="atp-label text-neutral-500">Lugar</dt>
            <dd className="mt-1 font-bold text-neutral-200">
              {event.nombreLugar || "Lugar a confirmar"}
            </dd>
            <dd className="text-neutral-400">{event.ubicacion}</dd>
            {event.ciudad && <dd className="text-neutral-400">{event.ciudad}</dd>}
          </div>
          {cache && (
            <div>
              <dt className="atp-label text-neutral-500">Caché ofrecido</dt>
              <dd className="mt-1 font-bold text-white">{cache}</dd>
            </div>
          )}
          <div>
            <dt className="atp-label text-neutral-500">Convocatoria</dt>
            <dd className="mt-1 font-bold uppercase text-white">
              {event.confirmedCount} de {event.cantidadMusicosRequerida} bandas confirmadas
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-3">
          <DeferredApplyToEventModal
            eventId={event.id}
            eventTitle={event.titulo}
            projects={projectsWithState}
            disabledReason={disabledReason}
          />
        </div>
      </div>
    </article>
  );
}
