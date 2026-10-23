"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptPostulation, rejectPostulation } from "@/app/actions/contracts";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getOrganizerPostulationActionState,
  type OrganizerPostulationGroups,
  type OrganizerPostulationListItem,
} from "@/lib/organizer-postulations";

type PostulationTab = keyof OrganizerPostulationGroups;
type ResolutionAction = "accept" | "reject";

interface OrganizerPostulationsListProps {
  groups: OrganizerPostulationGroups;
}

const tabs: Array<{ id: PostulationTab; label: string }> = [
  { id: "pending", label: "Pendientes" },
  { id: "accepted", label: "Aceptadas" },
  { id: "rejected", label: "Rechazadas" },
];

const emptyMessages: Record<PostulationTab, { title: string; description: string }> = {
  pending: {
    title: "No hay postulaciones pendientes",
    description: "Las nuevas solicitudes de proyectos musicales aparecerán en esta sección.",
  },
  accepted: {
    title: "No hay postulaciones aceptadas",
    description: "Las postulaciones que inicien una negociación quedarán disponibles en este historial.",
  },
  rejected: {
    title: "No hay postulaciones rechazadas",
    description: "Las solicitudes rechazadas se conservarán acá para consulta histórica.",
  },
};

const gridColumns =
  "lg:grid-cols-[7.25rem_minmax(0,1.1fr)_minmax(0,1fr)_7.25rem_7.5rem_8rem]";

export function OrganizerPostulationsList({ groups }: OrganizerPostulationsListProps) {
  const [activeTab, setActiveTab] = useState<PostulationTab>("pending");
  const postulations = groups[activeTab];
  const emptyMessage = emptyMessages[activeTab];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrar postulaciones recibidas"
        className="mb-5 flex border-b border-neutral-800"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`organizer-postulations-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="organizer-postulations-panel"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 border-b-2 px-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:px-4 sm:text-sm ${
              activeTab === tab.id
                ? "border-red-600 text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {tab.label}{" "}
            <span aria-label={`${groups[tab.id].length} postulaciones`}>
              ({groups[tab.id].length})
            </span>
          </button>
        ))}
      </div>

      <div
        id="organizer-postulations-panel"
        role="tabpanel"
        aria-labelledby={`organizer-postulations-${activeTab}-tab`}
      >
        {postulations.length === 0 ? (
          <DashboardEmptyState
            icon={
              <Image
                src="/branding/postulaciones-256.webp"
                alt=""
                width={80}
                height={80}
                className="mx-auto block h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            }
            title={emptyMessage.title}
            description={emptyMessage.description}
          />
        ) : (
          <div
            role="table"
            aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label}: postulaciones recibidas`}
            className="overflow-hidden border border-neutral-800 bg-neutral-950"
          >
            <div
              role="row"
              className={`hidden gap-3 border-b border-neutral-700 bg-neutral-900 px-4 py-3 lg:grid ${gridColumns}`}
            >
              {[
                "Fecha del evento",
                "Nombre del evento",
                "Banda / proyecto musical",
                "Fecha de postulación",
                "Estado",
                "Acciones",
              ].map((heading) => (
                <div key={heading} role="columnheader" className="atp-label text-neutral-400">
                  {heading}
                </div>
              ))}
            </div>

            <div className="divide-y divide-neutral-800">
              {postulations.map((postulation) => (
                <OrganizerPostulationRow key={postulation.id} postulation={postulation} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrganizerPostulationRow({
  postulation,
}: {
  postulation: OrganizerPostulationListItem;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionState = getOrganizerPostulationActionState(postulation);
  const detailId = `postulation-review-${postulation.id}`;

  return (
    <div role="rowgroup">
      <div
        role="row"
        className={`grid gap-4 px-4 py-4 transition-colors hover:bg-neutral-900/70 md:grid-cols-2 lg:items-center lg:gap-3 ${gridColumns}`}
      >
        <TableCell label="Fecha del evento">
          <time
            dateTime={new Date(postulation.evento.startsAt).toISOString()}
            className="font-bold text-neutral-200"
          >
            {new Date(postulation.evento.startsAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </time>
          <span className="block text-neutral-500">
            {new Date(postulation.evento.startsAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })} hs
          </span>
        </TableCell>

        <TableCell label="Nombre del evento">
          {postulation.evento.estado === "PUBLICADO" ? (
            <Link
              href={`/events/${postulation.evento.id}`}
              className="atp-heading break-words text-lg text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {postulation.evento.titulo}
            </Link>
          ) : (
            <span className="atp-heading break-words text-lg text-neutral-400">
              {postulation.evento.titulo}
            </span>
          )}
        </TableCell>

        <TableCell label="Banda / proyecto musical">
          <Link
            href={`/projects/${postulation.proyectoMusical.id}`}
            className="atp-heading break-words text-lg text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {postulation.proyectoMusical.nombre}
          </Link>
        </TableCell>

        <TableCell label="Fecha de postulación">
          <time dateTime={new Date(postulation.creadoEn).toISOString()} className="text-neutral-300">
            {new Date(postulation.creadoEn).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </time>
        </TableCell>

        <TableCell label="Estado">
          <StatusBadge status={postulation.estado} />
        </TableCell>

        <TableCell label="Acciones">
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              aria-expanded={isExpanded}
              aria-controls={detailId}
              className="atp-button atp-button-ghost min-h-9 px-3 text-xs"
            >
              {isExpanded ? "Cerrar revisión" : "Revisar"}
            </button>

            {actionState === "open-negotiation" && postulation.contratacion && (
              <Link
                href={`#organizer-contract-${postulation.contratacion.id}`}
                className="atp-button atp-button-primary min-h-9 px-3 text-xs"
              >
                Ir a negociación
              </Link>
            )}

            {actionState === "negotiation-unavailable" && (
              <span className="text-xs font-semibold leading-tight text-neutral-500">
                Negociación no disponible
              </span>
            )}
          </div>
        </TableCell>
      </div>

      {isExpanded && (
        <PostulationReview postulation={postulation} detailId={detailId} />
      )}
    </div>
  );
}

function PostulationReview({
  postulation,
  detailId,
}: {
  postulation: OrganizerPostulationListItem;
  detailId: string;
}) {
  const router = useRouter();
  const [confirmationAction, setConfirmationAction] = useState<ResolutionAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isResolvable = postulation.estado === "PENDIENTE";

  function processPostulation(action: ResolutionAction) {
    setFeedback(null);
    startTransition(async () => {
      const result = action === "accept"
        ? await acceptPostulation(postulation.id)
        : await rejectPostulation(postulation.id);

      if (result.error) {
        setFeedback(result.message);
        return;
      }

      setConfirmationAction(null);
      router.refresh();
    });
  }

  return (
    <div id={detailId} role="row" className="border-t border-neutral-800 bg-black p-4 sm:p-5">
      <div role="cell" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.55fr)]">
        <div>
          <p className="atp-label text-neutral-500">Mensaje de postulación</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-300">
            {postulation.mensaje || "El proyecto no agregó un mensaje a la postulación."}
          </p>
        </div>

        <div className="space-y-3 border-t border-neutral-800 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div>
            <span className="atp-label block text-neutral-500">Músico responsable</span>
            <span className="text-sm text-neutral-300">
              {postulation.musico.nombre} {postulation.musico.apellido}
            </span>
          </div>
          <div>
            <span className="atp-label block text-neutral-500">Estado actual</span>
            <div className="mt-1"><StatusBadge status={postulation.estado} /></div>
          </div>

          {feedback && (
            <p role="alert" className="atp-feedback atp-feedback-error text-sm">
              {feedback}
            </p>
          )}

          {isResolvable && !confirmationAction && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmationAction("reject")}
                className="atp-button atp-button-secondary min-h-9 px-3 text-xs"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => setConfirmationAction("accept")}
                className="atp-button atp-button-primary min-h-9 px-3 text-xs"
              >
                Aceptar e iniciar negociación
              </button>
            </div>
          )}

          {isResolvable && confirmationAction && (
            <div className="space-y-3 border-t border-neutral-800 pt-3">
              <p className="text-sm leading-relaxed text-neutral-300">
                {confirmationAction === "accept"
                  ? "¿Aceptar esta postulación? Se iniciará una negociación; la banda todavía no quedará confirmada."
                  : "¿Rechazar esta postulación? Quedará disponible en el historial de rechazadas."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmationAction(null)}
                  disabled={isPending}
                  className="atp-button atp-button-ghost min-h-9 px-3 text-xs"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => processPostulation(confirmationAction)}
                  disabled={isPending}
                  aria-busy={isPending}
                  className={`atp-button min-h-9 px-3 text-xs ${
                    confirmationAction === "accept"
                      ? "atp-button-primary"
                      : "atp-button-danger"
                  }`}
                >
                  {isPending ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TableCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="cell" className="min-w-0 text-sm">
      <span className="atp-label mb-1 block text-neutral-500 lg:hidden">{label}</span>
      {children}
    </div>
  );
}
