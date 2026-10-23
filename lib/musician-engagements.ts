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

interface DatedContract {
  id: string;
  estado: MusicianContractStatus;
  evento: { startsAt: Date | string };
}

interface DatedPostulation {
  id: string;
  estado: MusicianPostulationStatus;
  evento: { startsAt: Date | string };
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

export function groupMusicianEngagements<
  C extends DatedContract,
  P extends DatedPostulation,
>(contracts: C[], postulations: P[]) {
  const confirmed: Array<MusicianEngagement<C, P>> = contracts
    .filter((contract) => contract.estado === "ACORDADO" || contract.estado === "COMPLETADO")
    .map((item) => ({ kind: "contract" as const, item }));

  const pending: Array<MusicianEngagement<C, P>> = [
    ...contracts
      .filter((contract) => contract.estado === "NEGOCIANDO")
      .map((item) => ({ kind: "contract" as const, item })),
    ...postulations
      .filter((postulation) => postulation.estado === "PENDIENTE")
      .map((item) => ({ kind: "postulation" as const, item })),
  ];

  confirmed.sort(compareEngagements);
  pending.sort(compareEngagements);

  return { confirmed, pending };
}

export function formatAgreedAmount(
  status: MusicianContractStatus | "PENDIENTE",
  amount?: number | string | { toString(): string } | null
) {
  if ((status !== "ACORDADO" && status !== "COMPLETADO") || amount === null || amount === undefined) {
    return "Sin acuerdo";
  }

  const numericAmount = Number(amount.toString());
  return Number.isFinite(numericAmount)
    ? `$${numericAmount.toLocaleString("es-AR")}`
    : "Sin acuerdo";
}

export type MusicianContractActionState =
  | "negotiation"
  | "awaiting-event"
  | "rate-organizer"
  | "already-rated"
  | "unavailable";

export function getMusicianContractActionState(
  contractStatus: MusicianContractStatus,
  hasPreviousRating: boolean
): MusicianContractActionState {
  if (contractStatus === "NEGOCIANDO") return "negotiation";
  if (contractStatus === "ACORDADO") return "awaiting-event";

  const ratingState = getRatingActionState({
    contractStatus,
    isParticipant: true,
    hasPreviousRating,
  });

  if (ratingState === "eligible") return "rate-organizer";
  return ratingState;
}
