import { EVENT_CANCELLATION_BY_ORGANIZER_REASON } from "@/lib/constants";
import { getRatingActionState } from "@/lib/rating-presentation";

export type MusicianContractStatus =
  | "NEGOCIANDO"
  | "ACORDADO"
  | "CANCELADO"
  | "COMPLETADO";

export type MusicianPostulationStatus =
  | "PENDIENTE"
  | "ACEPTADA"
  | "RECHAZADA"
  | "CANCELADA";

export const MUSICIAN_ENGAGEMENT_EMPTY_MESSAGES = {
  confirmed: "Todavía no tenés fechas confirmadas vigentes",
  pending: "No tenés postulaciones ni negociaciones pendientes",
  finished: "Todavía no tenés fechas finalizadas",
  cancelled: "Todavía no tenés fechas canceladas",
} as const;

interface DatedContract {
  id: string;
  estado: MusicianContractStatus;
  postulacionId?: string | null;
  fechaAcuerdo?: Date | string | null;
  motivoCancelacion?: string | null;
  evento: {
    startsAt: Date | string;
    endsAt: Date | string;
    estado: "PUBLICADO" | "CANCELADO";
  };
}

interface DatedPostulation {
  id: string;
  estado: MusicianPostulationStatus;
  evento: {
    startsAt: Date | string;
    endsAt: Date | string;
    estado: "PUBLICADO" | "CANCELADO";
  };
}

export type MusicianEngagement<C, P> =
  | { kind: "contract"; item: C }
  | { kind: "postulation"; item: P };

function compareEngagements<C extends DatedContract, P extends DatedPostulation>(
  left: MusicianEngagement<C, P>,
  right: MusicianEngagement<C, P>
) {
  const dateDifference = new Date(left.item.evento.startsAt).getTime()
    - new Date(right.item.evento.startsAt).getTime();
  return dateDifference || left.item.id.localeCompare(right.item.id);
}

function compareEngagementsDescending<C extends DatedContract, P extends DatedPostulation>(
  left: MusicianEngagement<C, P>,
  right: MusicianEngagement<C, P>
) {
  const dateDifference = new Date(right.item.evento.startsAt).getTime()
    - new Date(left.item.evento.startsAt).getTime();
  return dateDifference || left.item.id.localeCompare(right.item.id);
}

export function groupMusicianEngagements<
  C extends DatedContract,
  P extends DatedPostulation,
>(contracts: C[], postulations: P[], now: Date = new Date()) {
  const nowTime = now.getTime();
  const isCurrentPublishedEvent = (item: C | P) =>
    item.evento.estado === "PUBLICADO"
    && new Date(item.evento.endsAt).getTime() > nowTime;
  const linkedPostulationIds = new Set(
    contracts.flatMap((contract) => contract.postulacionId ? [contract.postulacionId] : [])
  );

  const confirmed: Array<MusicianEngagement<C, P>> = contracts
    .filter((contract) =>
      contract.estado === "ACORDADO" && isCurrentPublishedEvent(contract)
    )
    .map((item) => ({ kind: "contract" as const, item }));

  const pending: Array<MusicianEngagement<C, P>> = [
    ...contracts
      .filter((contract) =>
        contract.estado === "NEGOCIANDO" && isCurrentPublishedEvent(contract)
      )
      .map((item) => ({ kind: "contract" as const, item })),
    ...postulations
      .filter((postulation) =>
        postulation.estado === "PENDIENTE"
        && isCurrentPublishedEvent(postulation)
        && !linkedPostulationIds.has(postulation.id)
      )
      .map((item) => ({ kind: "postulation" as const, item })),
  ];

  const finished: Array<MusicianEngagement<C, P>> = contracts
    .filter((contract) =>
      contract.evento.estado === "PUBLICADO"
      && (
        contract.estado === "COMPLETADO"
        || (
          contract.estado === "ACORDADO"
          && new Date(contract.evento.endsAt).getTime() <= nowTime
        )
      )
    )
    .map((item) => ({ kind: "contract" as const, item }));

  const cancelled: Array<MusicianEngagement<C, P>> = contracts
    .filter((contract) =>
      contract.evento.estado === "CANCELADO"
      && contract.fechaAcuerdo !== null
      && contract.fechaAcuerdo !== undefined
      && contract.motivoCancelacion === EVENT_CANCELLATION_BY_ORGANIZER_REASON
    )
    .map((item) => ({ kind: "contract" as const, item }));

  confirmed.sort(compareEngagements);
  pending.sort(compareEngagements);
  finished.sort(compareEngagements);
  cancelled.sort(compareEngagementsDescending);

  return { confirmed, pending, finished, cancelled };
}

export function formatAgreedAmount(
  status: MusicianContractStatus | "PENDIENTE",
  amount?: number | string | { toString(): string } | null
) {
  if (status === "NEGOCIANDO" || status === "PENDIENTE") {
    return "Sin acuerdo";
  }

  if (amount === null || amount === undefined) {
    return "Monto no informado";
  }

  const numericAmount = Number(amount.toString());
  return Number.isFinite(numericAmount)
    ? `$${numericAmount.toLocaleString("es-AR")}`
    : "Monto no informado";
}

export type MusicianContractActionState =
  | "negotiation"
  | "awaiting-event"
  | "awaiting-completion"
  | "rate-organizer"
  | "already-rated"
  | "unavailable";

export function getMusicianContractActionState(
  contractStatus: MusicianContractStatus,
  hasPreviousRating: boolean,
  eventEndsAt?: Date | string,
  now: Date = new Date()
): MusicianContractActionState {
  if (contractStatus === "NEGOCIANDO") return "negotiation";
  if (contractStatus === "ACORDADO") {
    return eventEndsAt && new Date(eventEndsAt).getTime() <= now.getTime()
      ? "awaiting-completion"
      : "awaiting-event";
  }

  const ratingState = getRatingActionState({
    contractStatus,
    isParticipant: true,
    hasPreviousRating,
  });

  if (ratingState === "eligible") return "rate-organizer";
  return ratingState;
}
