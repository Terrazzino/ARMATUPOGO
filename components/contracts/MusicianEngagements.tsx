"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelPostulation } from "@/app/actions/contracts";
import { DeferredNegotiationCard } from "@/components/contracts/DeferredNegotiationCard";
import { DeferredRatingModal } from "@/components/ratings/DeferredRatingModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  formatAgreedAmount,
  getMusicianContractActionState,
  groupMusicianEngagements,
  type MusicianContractStatus,
  type MusicianEngagement,
  type MusicianPostulationStatus,
} from "@/lib/musician-engagements";

interface MusicianContract {
  id: string;
  estado: MusicianContractStatus;
  montoPactado?: number | null;
  fechaAcuerdo?: Date | string | null;
  motivoCancelacion?: string | null;
  hasCurrentUserRating: boolean;
  evento: {
    id: string;
    titulo: string;
    startsAt: Date | string;
    ubicacion: string;
    nombreLugar?: string | null;
    ciudad?: string | null;
  };
  proyectoMusical: {
    id: string;
    nombre: string;
    genero: string;
  };
  organizador: {
    nombre: string;
    apellido: string;
  };
  musico: {
    nombre: string;
    apellido: string;
  };
  ofertas?: Array<{
    id: string;
    monto: number;
    mensaje?: string | null;
    estado: string;
    remitenteId?: string;
    creadoEn: Date | string;
  }>;
}

interface MusicianPostulation {
  id: string;
  estado: MusicianPostulationStatus;
  creadoEn: Date | string;
  evento: {
    id: string;
    titulo: string;
    startsAt: Date | string;
    ubicacion: string;
    nombreLugar?: string | null;
    ciudad?: string | null;
    organizador: {
      nombre: string;
      apellido: string;
    };
  };
  proyectoMusical: {
    id: string;
    nombre: string;
  };
}

interface MusicianEngagementsProps {
  contracts: MusicianContract[];
  postulations: MusicianPostulation[];
  currentUserId: string;
}

type Engagement = MusicianEngagement<MusicianContract, MusicianPostulation>;
type Tab = "confirmed" | "pending";

const gridColumns = "lg:grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1.25fr)_7rem_9rem]";

export function MusicianEngagements({
  contracts,
  postulations,
  currentUserId,
}: MusicianEngagementsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("confirmed");
  const groups = groupMusicianEngagements(contracts, postulations);
  const rows = activeTab === "confirmed" ? groups.confirmed : groups.pending;

  return (
    <div>
      <div role="tablist" aria-label="Filtrar fechas y contrataciones" className="mb-5 flex border-b border-neutral-800">
        <TabButton
          active={activeTab === "confirmed"}
          controls="musician-confirmed-panel"
          onClick={() => setActiveTab("confirmed")}
        >
          Confirmadas <span aria-label={`${groups.confirmed.length} registros`}>({groups.confirmed.length})</span>
        </TabButton>
        <TabButton
          active={activeTab === "pending"}
          controls="musician-pending-panel"
          onClick={() => setActiveTab("pending")}
        >
          Pendientes <span aria-label={`${groups.pending.length} registros`}>({groups.pending.length})</span>
        </TabButton>
      </div>

      <div
        id={activeTab === "confirmed" ? "musician-confirmed-panel" : "musician-pending-panel"}
        role="tabpanel"
        aria-label={activeTab === "confirmed" ? "Contrataciones confirmadas" : "Postulaciones y negociaciones pendientes"}
      >
        {rows.length === 0 ? (
          <div className="atp-empty-state py-10">
            <h3 className="atp-heading text-2xl">
              {activeTab === "confirmed" ? "No hay fechas confirmadas" : "No hay gestiones pendientes"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {activeTab === "confirmed"
                ? "Los acuerdos cerrados y eventos completados aparecerán en esta sección."
                : "Las postulaciones pendientes y negociaciones activas aparecerán acá."}
            </p>
          </div>
        ) : (
          <div role="table" aria-label="Mis fechas y contrataciones" className="overflow-hidden border border-neutral-800 bg-neutral-950">
            <div role="row" className={`hidden gap-3 border-b border-neutral-700 bg-neutral-900 px-4 py-3 lg:grid ${gridColumns}`}>
              {[
                "Fecha",
                "Nombre del evento",
                "Organizador",
                "Localidad y dirección",
                "Monto pactado",
                "Acciones",
              ].map((heading) => (
                <div key={heading} role="columnheader" className="atp-label text-neutral-400">
                  {heading}
                </div>
              ))}
            </div>

            <div className="divide-y divide-neutral-800">
              {rows.map((engagement) => (
                <EngagementRow
                  key={`${engagement.kind}-${engagement.item.id}`}
                  engagement={engagement}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  controls,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`min-h-11 border-b-2 px-4 text-sm font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
        active
          ? "border-red-600 text-white"
          : "border-transparent text-neutral-500 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function EngagementRow({
  engagement,
  currentUserId,
}: {
  engagement: Engagement;
  currentUserId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const item = engagement.item;
  const event = item.evento;
  const organizer = engagement.kind === "contract"
    ? engagement.item.organizador
    : engagement.item.evento.organizador;
  const project = item.proyectoMusical;
  const amount = engagement.kind === "contract"
    ? formatAgreedAmount(engagement.item.estado, engagement.item.montoPactado)
    : formatAgreedAmount("PENDIENTE");
  const negotiationId = `negotiation-${item.id}`;
  const contractActionState = engagement.kind === "contract"
    ? getMusicianContractActionState(
        engagement.item.estado,
        engagement.item.hasCurrentUserRating
      )
    : "unavailable";

  return (
    <div role="rowgroup">
      <div role="row" className={`grid gap-4 px-4 py-4 transition-colors hover:bg-neutral-900/70 lg:items-center lg:gap-3 ${gridColumns}`}>
        <TableCell label="Fecha">
          <time dateTime={new Date(event.startsAt).toISOString()} className="font-bold text-neutral-200">
            {new Date(event.startsAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </time>
        </TableCell>

        <TableCell label="Nombre del evento">
          <Link href={`/events/${event.id}`} className="atp-heading text-xl hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            {event.titulo}
          </Link>
          <p className="mt-1 text-xs text-neutral-500">{project.nombre}</p>
          <div className="mt-2"><StatusBadge status={item.estado} /></div>
        </TableCell>

        <TableCell label="Organizador">
          <span className="text-neutral-300">{organizer.nombre} {organizer.apellido}</span>
        </TableCell>

        <TableCell label="Localidad y dirección">
          <span className="font-semibold text-neutral-300">
            {[event.nombreLugar, event.ciudad].filter(Boolean).join(" · ") || "Lugar a confirmar"}
          </span>
          <span className="block text-neutral-500">{event.ubicacion}</span>
        </TableCell>

        <TableCell label="Monto pactado">
          <span className={amount === "Sin acuerdo" ? "text-neutral-500" : "font-bold text-emerald-300"}>
            {amount}
          </span>
        </TableCell>

        <TableCell label="Acciones">
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            {contractActionState === "negotiation" ? (
              <button
                type="button"
                onClick={() => setIsExpanded((value) => !value)}
                aria-expanded={isExpanded}
                aria-controls={negotiationId}
                className="atp-button atp-button-primary min-h-9 px-3 text-xs"
              >
                {isExpanded ? "Cerrar detalle" : "Ver negociación"}
              </button>
            ) : engagement.kind === "postulation" ? (
              <CancelPostulationAction postulationId={item.id} />
            ) : contractActionState === "rate-organizer" && engagement.kind === "contract" ? (
              <DeferredRatingModal
                contractId={engagement.item.id}
                targetName={`${engagement.item.organizador.nombre} ${engagement.item.organizador.apellido}`}
                triggerLabel="Calificar organizador"
              />
            ) : contractActionState === "already-rated" ? (
              <span className="text-xs font-semibold text-neutral-400">Ya calificado</span>
            ) : contractActionState === "awaiting-event" ? (
              <span className="text-xs font-semibold leading-tight text-neutral-500">
                Pendiente de realizarse
              </span>
            ) : null}
          </div>
        </TableCell>
      </div>

      {engagement.kind === "contract" && engagement.item.estado === "NEGOCIANDO" && isExpanded && (
        <div role="row" id={negotiationId} className="border-t border-neutral-800 bg-black p-3 sm:p-4">
          <div role="cell">
            <DeferredNegotiationCard contract={engagement.item} currentUserId={currentUserId} />
          </div>
        </div>
      )}
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

function CancelPostulationAction({ postulationId }: { postulationId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmCancellation() {
    setFeedback(null);
    startTransition(async () => {
      const result = await cancelPostulation(postulationId);
      if (result.error) {
        setFeedback({ error: true, message: result.message });
        return;
      }

      setFeedback({ error: false, message: "Postulación cancelada." });
      setIsConfirming(false);
      router.refresh();
    });
  }

  if (feedback) {
    return (
      <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-xs text-red-300" : "text-xs text-emerald-300"}>
        {feedback.message}
      </p>
    );
  }

  if (isConfirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-neutral-400">¿Cancelar esta postulación?</p>
        <div className="flex gap-2">
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
      Cancelar postulación
    </button>
  );
}
