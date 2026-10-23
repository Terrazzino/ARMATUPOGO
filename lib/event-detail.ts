import type { EstadoEvento, RolUsuario } from "@/lib/types";
import type { MusicianOpportunityState } from "@/lib/musician-event-board";

export type EventTemporalState = "UPCOMING" | "ONGOING" | "PAST";

export function getEventDetailNavigation(role: RolUsuario | null) {
  if (role === "MUSICO") {
    return { variant: "dashboard" as const, activeItem: "discovery" as const };
  }
  if (role === "ORGANIZADOR") {
    return { variant: "dashboard" as const, activeItem: null };
  }
  return { variant: "public" as const, activeItem: null };
}

export function getEventTemporalState(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  now?: Date;
}): EventTemporalState {
  const now = (input.now ?? new Date()).getTime();
  if (now < new Date(input.startsAt).getTime()) return "UPCOMING";
  if (now < new Date(input.endsAt).getTime()) return "ONGOING";
  return "PAST";
}

export function getEventApplicationDisabledReason(input: {
  status: EstadoEvento;
  startsAt: Date | string;
  endsAt: Date | string;
  confirmedCount: number;
  requiredCount: number;
  now?: Date;
}) {
  if (input.status === "CANCELADO") {
    return "Este evento fue cancelado y no acepta postulaciones.";
  }

  const temporalState = getEventTemporalState(input);
  if (temporalState === "PAST") {
    return "Este evento ya finalizó y no acepta postulaciones.";
  }
  if (temporalState === "ONGOING") {
    return "Este evento ya comenzó y no acepta postulaciones.";
  }
  if (input.confirmedCount >= input.requiredCount) {
    return "La convocatoria ya completó sus cupos confirmados.";
  }

  return undefined;
}

export function hasEventFlyer(bannerUrl: string | null | undefined) {
  return Boolean(bannerUrl?.trim());
}

export function canShowEventApplication(
  projectStates: MusicianOpportunityState[],
  disabledReason?: string
) {
  return !disabledReason && projectStates.includes("DISPONIBLE");
}
