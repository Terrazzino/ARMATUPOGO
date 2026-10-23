import Link from "next/link";
import { DeferredApplyToEventModal } from "@/components/events/DeferredApplyToEventModal";
import { canShowEventApplication } from "@/lib/event-detail";
import {
  musicianOpportunityLabels,
  type MusicianOpportunityState,
} from "@/lib/musician-event-board";

interface EventParticipationPanelProps {
  eventId: string;
  eventTitle: string;
  projects: Array<{
    id: string;
    nombre: string;
    state: MusicianOpportunityState;
  }>;
  disabledReason?: string;
}

const opportunityDescriptions: Partial<Record<MusicianOpportunityState, string>> = {
  PENDIENTE: "Tu postulación fue enviada. Estás esperando una respuesta del organizador.",
  NEGOCIANDO: "El organizador aceptó tu propuesta y la contratación está en negociación.",
  CONFIRMADA: "Tu banda está confirmada para esta fecha.",
  COMPLETADA: "La participación de tu banda en esta fecha fue completada.",
  RECHAZADA: "El organizador rechazó esta postulación.",
  CANCELADA: "Esta postulación o contratación fue cancelada.",
};

export function EventParticipationPanel({
  eventId,
  eventTitle,
  projects,
  disabledReason,
}: EventParticipationPanelProps) {
  const hasNegotiation = projects.some((project) => project.state === "NEGOCIANDO");
  const showApplication = canShowEventApplication(
    projects.map((project) => project.state),
    disabledReason
  );

  return (
    <section aria-labelledby="participation-title">
      <p className="atp-kicker">Estado personal</p>
      <h2 id="participation-title" className="atp-heading mt-1 text-3xl">
        Tu participación
      </h2>

      {projects.length === 0 ? (
        <div className="mt-4 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
          <p>Necesitás un proyecto musical activo para postularte.</p>
          <Link
            href="/dashboard/musician"
            className="mt-3 inline-flex font-bold text-red-400 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Ir a mis proyectos
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
          {projects.map((project) => (
            <li key={project.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-bold text-neutral-100">{project.nombre}</span>
                <span className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-neutral-300">
                  {musicianOpportunityLabels[project.state]}
                </span>
              </div>
              {opportunityDescriptions[project.state] && (
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {opportunityDescriptions[project.state]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {projects.length > 0 && showApplication && (
        <div className="mt-5 max-w-sm">
          <DeferredApplyToEventModal
            eventId={eventId}
            eventTitle={eventTitle}
            projects={projects}
          />
        </div>
      )}

      {projects.length > 0 && disabledReason && (
        <p className="mt-5 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
          {disabledReason}
        </p>
      )}

      {hasNegotiation && (
        <Link
          href="/dashboard/musician"
          className="atp-button atp-button-secondary mt-3 w-full max-w-sm text-sm"
        >
          Ver negociación
        </Link>
      )}
    </section>
  );
}
