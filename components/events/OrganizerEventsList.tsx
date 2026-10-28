"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelEvent } from "@/app/actions/events";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import {
  canCancelOrganizerEvent,
  getConfirmedBandsCount,
  hasActiveEventContracts,
  type OrganizerEventGroups,
  type OrganizerEventListItem,
} from "@/lib/organizer-events";
import { DeferredEditEventModal } from "@/components/events/DeferredEditEventModal";

type EventTab = keyof OrganizerEventGroups;

interface OrganizerEventsListProps {
  groups: OrganizerEventGroups;
  now: string;
}

const tabs: Array<{ id: EventTab; label: string }> = [
  { id: "upcoming", label: "Próximos" },
  { id: "finished", label: "Finalizados" },
  { id: "cancelled", label: "Cancelados" },
];

const emptyMessages: Record<EventTab, { title: string; description: string }> = {
  upcoming: {
    title: "No hay eventos próximos",
    description: "Los próximos recitales publicados aparecerán en esta sección.",
  },
  finished: {
    title: "No hay eventos finalizados",
    description: "Cuando termine una fecha publicada, quedará disponible en este historial.",
  },
  cancelled: {
    title: "No hay eventos cancelados",
    description: "Los eventos cancelados se conservarán acá para consulta histórica.",
  },
};

const gridColumns =
  "lg:grid-cols-[7.25rem_minmax(0,1.15fr)_minmax(0,1.1fr)_9rem_8.5rem_9rem]";

export function OrganizerEventsList({ groups, now }: OrganizerEventsListProps) {
  const [activeTab, setActiveTab] = useState<EventTab>("upcoming");
  const events = groups[activeTab];
  const emptyMessage = emptyMessages[activeTab];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrar eventos del organizador"
        className="mb-5 flex border-b border-neutral-800"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`organizer-events-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="organizer-events-panel"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 border-b-2 px-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:min-h-10 sm:px-4 sm:text-sm ${
              activeTab === tab.id
                ? "border-red-600 text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {tab.label}{" "}
            <span aria-label={`${groups[tab.id].length} eventos`}>({groups[tab.id].length})</span>
          </button>
        ))}
      </div>

      <div
        id="organizer-events-panel"
        role="tabpanel"
        aria-labelledby={`organizer-events-${activeTab}-tab`}
      >
        {events.length === 0 ? (
          <DashboardEmptyState
            icon={
              <Image
                src="/branding/calendario-256.webp"
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
            aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label}: eventos del organizador`}
            className="overflow-hidden border border-neutral-800 bg-neutral-950"
          >
            <div
              role="row"
              className={`hidden gap-3 border-b border-neutral-700 bg-neutral-900 px-4 py-3 lg:grid ${gridColumns}`}
            >
              {["Fecha", "Evento", "Lugar y localidad", "Bandas confirmadas", "Estado", "Acciones"].map(
                (heading) => (
                  <div key={heading} role="columnheader" className="atp-label text-neutral-400">
                    {heading}
                  </div>
                )
              )}
            </div>

            <div className="divide-y divide-neutral-800">
              {events.map((event) => (
                <OrganizerEventRow
                  key={event.id}
                  event={event}
                  tab={activeTab}
                  now={now}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrganizerEventRow({
  event,
  tab,
  now,
}: {
  event: OrganizerEventListItem;
  tab: EventTab;
  now: string;
}) {
  const confirmedBands = getConfirmedBandsCount(event);
  const stateLabel = tab === "cancelled"
    ? "Cancelado"
    : tab === "finished"
      ? "Publicado · Finalizado"
      : "Publicado · Próximo";

  return (
    <div
      role="row"
      className={`grid gap-3.5 px-4 py-3.5 transition-colors hover:bg-neutral-900/70 md:grid-cols-2 lg:items-center lg:gap-3 ${gridColumns}`}
    >
      <TableCell label="Fecha">
        <time dateTime={new Date(event.startsAt).toISOString()} className="font-bold text-neutral-200">
          {new Date(event.startsAt).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </time>
        <span className="block text-neutral-500">
          {new Date(event.startsAt).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })} hs
        </span>
      </TableCell>

      <TableCell label="Evento">
        {event.estado === "PUBLICADO" ? (
          <Link
            href={`/events/${event.id}`}
            className="atp-heading text-xl text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {event.titulo}
          </Link>
        ) : (
          <span className="atp-heading text-xl text-neutral-400">{event.titulo}</span>
        )}
      </TableCell>

      <TableCell label="Lugar y localidad">
        <span className="font-semibold text-neutral-300">
          {event.nombreLugar || "Lugar a confirmar"}
        </span>
        <span className="block text-neutral-500">{event.ubicacion}</span>
        {event.ciudad && <span className="block text-neutral-500">{event.ciudad}</span>}
      </TableCell>

      <TableCell label="Bandas confirmadas">
        <span className="font-bold uppercase text-neutral-200">
          {confirmedBands} de {event.cantidadMusicosRequerida}
        </span>
        <span className="block text-xs uppercase tracking-wide text-neutral-500">
          bandas confirmadas
        </span>
      </TableCell>

      <TableCell label="Estado">
        <span
          className={`inline-flex border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            tab === "cancelled"
              ? "border-red-900/80 bg-red-950/40 text-red-300"
              : tab === "finished"
                ? "border-neutral-700 bg-neutral-900 text-neutral-400"
                : "border-emerald-900 bg-emerald-950/40 text-emerald-300"
          }`}
        >
          {stateLabel}
        </span>
      </TableCell>

      <TableCell label="Acciones">
        <div className="flex flex-wrap gap-2">
          <DeferredEditEventModal event={{
            id: event.id,
            titulo: event.titulo,
            descripcion: event.descripcion ?? null,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            ubicacion: event.ubicacion,
            nombreLugar: event.nombreLugar,
            ciudad: event.ciudad,
            cantidadMusicosRequerida: event.cantidadMusicosRequerida,
            cacheOfrecido: event.cacheOfrecido ?? null,
            precioEntrada: event.precioEntrada ?? null,
            bannerUrl: event.bannerUrl ?? null,
            estado: event.estado,
            hasActiveContracts: hasActiveEventContracts(event),
          }} />
          {canCancelOrganizerEvent(event, new Date(now)) && (
            <CancelEventAction eventId={event.id} eventTitle={event.titulo} />
          )}
        </div>
      </TableCell>
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

function CancelEventAction({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmCancellation() {
    setFeedback(null);
    startTransition(async () => {
      const result = await cancelEvent(eventId);
      if (result.error) {
        setFeedback(result.message);
        return;
      }

      setIsConfirming(false);
      router.refresh();
    });
  }

  if (feedback) {
    return <p role="alert" className="text-xs text-red-300">{feedback}</p>;
  }

  if (isConfirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-tight text-neutral-400">
          ¿Cancelar «{eventTitle}»?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsConfirming(false)}
            disabled={isPending}
            className="atp-button atp-button-ghost min-h-9 px-2 text-xs"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirmCancellation}
            disabled={isPending}
            aria-busy={isPending}
            className="atp-button atp-button-danger min-h-9 px-2 text-xs"
          >
            {isPending ? "Cancelando..." : "Confirmar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="atp-button atp-button-ghost min-h-9 px-3 text-xs text-red-400"
    >
      Cancelar evento
    </button>
  );
}
