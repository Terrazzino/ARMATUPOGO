"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelContract, completeContract } from "@/app/actions/contracts";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DeferredNegotiationCard } from "@/components/contracts/DeferredNegotiationCard";
import { DeferredRatingModal } from "@/components/ratings/DeferredRatingModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAgreedAmount } from "@/lib/musician-engagements";
import {
  getOrganizerContractActionState,
  type OrganizerContractGroups,
  type OrganizerContractListItem,
} from "@/lib/organizer-contracts";

type ContractTab = keyof OrganizerContractGroups;
type LifecycleAction = "complete" | "cancel";

interface OrganizerContractsListProps {
  groups: OrganizerContractGroups;
  currentUserId: string;
  now: string;
}

const tabs: Array<{ id: ContractTab; label: string }> = [
  { id: "confirmed", label: "Confirmadas" },
  { id: "pending", label: "Pendientes" },
];

const emptyMessages: Record<ContractTab, { title: string; description: string }> = {
  confirmed: {
    title: "No hay contrataciones confirmadas",
    description: "Los acuerdos cerrados y las participaciones completadas aparecerán en esta sección.",
  },
  pending: {
    title: "No hay negociaciones pendientes",
    description: "Las contrataciones que todavía estén negociando sus condiciones aparecerán acá.",
  },
};

const gridColumns =
  "xl:grid-cols-[6.75rem_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,1fr)_7rem_10rem]";

export function OrganizerContractsList({
  groups,
  currentUserId,
  now,
}: OrganizerContractsListProps) {
  const [activeTab, setActiveTab] = useState<ContractTab>("confirmed");
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const contracts = groups[activeTab];
  const emptyMessage = emptyMessages[activeTab];

  useEffect(() => {
    function openLinkedContract() {
      const prefix = "#organizer-contract-";
      if (!window.location.hash.startsWith(prefix)) return;

      const contractId = window.location.hash.slice(prefix.length);
      if (!groups.pending.some((contract) => contract.id === contractId)) return;

      setActiveTab("pending");
      setExpandedContractId(contractId);
      window.setTimeout(() => {
        document.getElementById(`organizer-contract-${contractId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }

    openLinkedContract();
    window.addEventListener("hashchange", openLinkedContract);
    return () => window.removeEventListener("hashchange", openLinkedContract);
  }, [groups.pending]);

  function selectTab(tab: ContractTab) {
    setActiveTab(tab);
    setExpandedContractId(null);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrar negociaciones y contrataciones"
        className="mb-5 flex border-b border-neutral-800"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`organizer-contracts-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="organizer-contracts-panel"
            onClick={() => selectTab(tab.id)}
            className={`min-h-11 border-b-2 px-4 text-sm font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:min-h-10 ${
              activeTab === tab.id
                ? "border-red-600 text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {tab.label}{" "}
            <span aria-label={`${groups[tab.id].length} contrataciones`}>
              ({groups[tab.id].length})
            </span>
          </button>
        ))}
      </div>

      <div
        id="organizer-contracts-panel"
        role="tabpanel"
        aria-labelledby={`organizer-contracts-${activeTab}-tab`}
      >
        {contracts.length === 0 ? (
          <DashboardEmptyState
            icon={
              <Image
                src="/branding/contrato-256.webp"
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
            aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label}: negociaciones y contrataciones`}
            className="overflow-hidden border border-neutral-800 bg-neutral-950"
          >
            <div
              role="row"
              className={`hidden gap-3 border-b border-neutral-700 bg-neutral-900 px-4 py-3 xl:grid ${gridColumns}`}
            >
              {[
                "Fecha",
                "Nombre del evento",
                "Banda / proyecto musical",
                "Responsable del proyecto",
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
              {contracts.map((contract) => (
                <OrganizerContractRow
                  key={contract.id}
                  contract={contract}
                  currentUserId={currentUserId}
                  now={now}
                  negotiationExpanded={expandedContractId === contract.id}
                  onToggleNegotiation={() => setExpandedContractId((current) =>
                    current === contract.id ? null : contract.id
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrganizerContractRow({
  contract,
  currentUserId,
  now,
  negotiationExpanded,
  onToggleNegotiation,
  compact = false,
  actionsDisabled = false,
}: {
  contract: OrganizerContractListItem;
  currentUserId: string;
  now: string;
  negotiationExpanded: boolean;
  onToggleNegotiation: () => void;
  compact?: boolean;
  actionsDisabled?: boolean;
}) {
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const actionState = actionsDisabled
    ? "hidden"
    : getOrganizerContractActionState(contract, new Date(now));
  const amount = formatAgreedAmount(contract.estado, contract.montoPactado);

  return (
    <div id={`organizer-contract-${contract.id}`} role="rowgroup" className="scroll-mt-6">
      <div
        role="row"
        className={compact
          ? "grid gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-900/70 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_7rem_minmax(8rem,auto)] md:items-center"
          : `grid gap-3.5 px-4 py-3.5 transition-colors hover:bg-neutral-900/70 md:grid-cols-2 xl:items-center xl:gap-3 ${gridColumns}`}
      >
        {compact ? (
          <>
            <div role="cell" className="min-w-0">
              <Link
                href={`/projects/${contract.proyectoMusical.id}`}
                className="atp-heading break-words text-xl text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {contract.proyectoMusical.nombre}
              </Link>
              <p className="mt-1 text-xs text-neutral-500">
                Responsable: {contract.musico.nombre} {contract.musico.apellido}
              </p>
            </div>
            <div role="cell" className="min-w-0 text-sm">
              {contract.evento.estado === "PUBLICADO" ? (
                <Link
                  href={`/events/${contract.evento.id}`}
                  className="font-bold text-neutral-200 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {contract.evento.titulo}
                </Link>
              ) : (
                <span className="font-bold text-neutral-500">{contract.evento.titulo}</span>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(contract.evento.startsAt).toLocaleDateString("es-AR")} · <StatusBadge status={contract.estado} />
              </p>
            </div>
            <div role="cell" className="text-sm">
              <span className="atp-label mb-1 block text-neutral-500 md:hidden">Monto</span>
              <span className={amount === "Sin acuerdo" ? "text-neutral-500" : "font-bold text-emerald-300"}>{amount}</span>
            </div>
            <div role="cell" className="flex flex-wrap gap-2 md:justify-end">
              {actionState === "negotiation" && (
                <button type="button" onClick={onToggleNegotiation} aria-expanded={negotiationExpanded} aria-controls={`organizer-negotiation-${contract.id}`} className="atp-button atp-button-primary min-h-9 px-3 text-xs">
                  {negotiationExpanded ? "Cerrar negociación" : "Ver negociación"}
                </button>
              )}
              {actionState === "awaiting-event" && (
                <>
                  <span className="text-xs font-semibold text-neutral-500">Pendiente de realizarse</span>
                  <button type="button" onClick={() => setLifecycleAction("cancel")} className="atp-button atp-button-ghost min-h-9 px-3 text-xs text-red-400">Cancelar acuerdo</button>
                </>
              )}
              {actionState === "event-in-progress" && <span className="text-xs font-semibold text-neutral-500">Evento en curso</span>}
              {actionState === "complete" && (
                <button type="button" onClick={() => setLifecycleAction("complete")} className="atp-button atp-button-primary min-h-9 px-3 text-xs">Marcar completada</button>
              )}
              {actionState === "rate-musician" && (
                <DeferredRatingModal contractId={contract.id} targetName={`${contract.musico.nombre} ${contract.musico.apellido}`} triggerLabel="Calificar músico" />
              )}
              {actionState === "already-rated" && <span className="text-xs font-semibold text-neutral-400">Ya calificado</span>}
              {actionState === "hidden" && <span className="text-xs font-semibold text-neutral-500">Sin acciones disponibles</span>}
            </div>
          </>
        ) : (
          <>
        <TableCell label="Fecha">
          <time dateTime={contract.evento.startsAt} className="font-bold text-neutral-200">
            {new Date(contract.evento.startsAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </time>
          <span className="block text-neutral-500">
            {new Date(contract.evento.startsAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })} hs
          </span>
        </TableCell>

        <TableCell label="Nombre del evento">
          {contract.evento.estado === "PUBLICADO" ? (
            <Link
              href={`/events/${contract.evento.id}`}
              className="atp-heading break-words text-lg text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {contract.evento.titulo}
            </Link>
          ) : (
            <span className="atp-heading break-words text-lg text-neutral-400">
              {contract.evento.titulo}
            </span>
          )}
          <div className="mt-1"><StatusBadge status={contract.estado} /></div>
        </TableCell>

        <TableCell label="Banda / proyecto musical">
          <Link
            href={`/projects/${contract.proyectoMusical.id}`}
            className="atp-heading break-words text-lg text-neutral-100 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {contract.proyectoMusical.nombre}
          </Link>
        </TableCell>

        <TableCell label="Responsable del proyecto">
          <span className="text-neutral-300">
            {contract.musico.nombre} {contract.musico.apellido}
          </span>
        </TableCell>

        <TableCell label="Localidad y dirección">
          <span className="font-semibold text-neutral-300">
            {[contract.evento.nombreLugar, contract.evento.ciudad].filter(Boolean).join(" · ") || "Lugar a confirmar"}
          </span>
          <span className="block text-neutral-500">{contract.evento.ubicacion}</span>
        </TableCell>

        <TableCell label="Monto pactado">
          <span className={amount === "Sin acuerdo" ? "text-neutral-500" : "font-bold text-emerald-300"}>
            {amount}
          </span>
        </TableCell>

        <TableCell label="Acciones">
          <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
            {actionState === "negotiation" && (
              <button
                type="button"
                onClick={onToggleNegotiation}
                aria-expanded={negotiationExpanded}
                aria-controls={`organizer-negotiation-${contract.id}`}
                className="atp-button atp-button-primary min-h-9 px-3 text-xs"
              >
                {negotiationExpanded ? "Cerrar negociación" : "Ver negociación"}
              </button>
            )}

            {actionState === "awaiting-event" && (
              <>
                <span className="text-xs font-semibold leading-tight text-neutral-500">
                  Pendiente de realizarse
                </span>
                <button
                  type="button"
                  onClick={() => setLifecycleAction("cancel")}
                  className="atp-button atp-button-ghost min-h-9 px-3 text-xs text-red-400"
                >
                  Cancelar acuerdo
                </button>
              </>
            )}

            {actionState === "event-in-progress" && (
              <span className="text-xs font-semibold leading-tight text-neutral-500">
                Evento en curso
              </span>
            )}

            {actionState === "complete" && (
              <button
                type="button"
                onClick={() => setLifecycleAction("complete")}
                className="atp-button atp-button-primary min-h-9 px-3 text-xs"
              >
                Marcar completada
              </button>
            )}

            {actionState === "rate-musician" && (
              <DeferredRatingModal
                contractId={contract.id}
                targetName={`${contract.musico.nombre} ${contract.musico.apellido}`}
                triggerLabel="Calificar músico"
              />
            )}

            {actionState === "already-rated" && (
              <span className="text-xs font-semibold text-neutral-400">Ya calificado</span>
            )}
          </div>
        </TableCell>
          </>
        )}
      </div>

      {actionState === "negotiation" && negotiationExpanded && (
        <div id={`organizer-negotiation-${contract.id}`} role="row" className="border-t border-neutral-800 bg-black p-3 sm:p-4">
          <div role="cell">
            <DeferredNegotiationCard contract={contract} currentUserId={currentUserId} />
          </div>
        </div>
      )}

      {lifecycleAction && (
        <ContractLifecyclePanel
          contract={contract}
          action={lifecycleAction}
          onClose={() => setLifecycleAction(null)}
        />
      )}
    </div>
  );
}

function ContractLifecyclePanel({
  contract,
  action,
  onClose,
}: {
  contract: OrganizerContractListItem;
  action: LifecycleAction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmAction() {
    setFeedback(null);
    startTransition(async () => {
      const result = action === "complete"
        ? await completeContract(contract.id)
        : await cancelContract({
            contratacionId: contract.id,
            motivoCancelacion: cancelReason,
          });

      if (result.error) {
        setFeedback(result.message);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  const invalidCancelReason = action === "cancel" && cancelReason.trim().length < 5;

  return (
    <div role="row" className="border-t border-neutral-800 bg-black p-4">
      <div role="cell" className="mx-auto max-w-2xl space-y-4">
        <div>
          <h4 className="atp-heading text-xl">
            {action === "complete" ? "Confirmar participación completada" : "Cancelar acuerdo"}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            {action === "complete"
              ? `¿Confirmás que la participación de ${contract.proyectoMusical.nombre} ya se realizó? Después podrá ser valorada.`
              : "La cancelación dará de baja el acuerdo y no podrá reactivarse."}
          </p>
        </div>

        {action === "cancel" && (
          <div>
            <label htmlFor={`organizer-cancel-reason-${contract.id}`} className="atp-label mb-2 block">
              Motivo de cancelación
            </label>
            <textarea
              id={`organizer-cancel-reason-${contract.id}`}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={2}
              minLength={5}
              disabled={isPending}
              className="atp-field"
              placeholder="Explicá el motivo..."
            />
          </div>
        )}

        {feedback && <p role="alert" className="atp-feedback atp-feedback-error text-sm">{feedback}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="atp-button atp-button-ghost min-h-9 px-3 text-xs"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirmAction}
            disabled={isPending || invalidCancelReason}
            aria-busy={isPending}
            className={`atp-button min-h-9 px-3 text-xs ${
              action === "complete" ? "atp-button-primary" : "atp-button-danger"
            }`}
          >
            {isPending
              ? "Procesando..."
              : action === "complete"
                ? "Confirmar finalización"
                : "Confirmar cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="cell" className="min-w-0 text-sm">
      <span className="atp-label mb-1 block text-neutral-500 xl:hidden">{label}</span>
      {children}
    </div>
  );
}
