import { calcularCupos } from "@/lib/cupos";

export type OrganizerEventStatus = "PUBLICADO" | "CANCELADO";
export type OrganizerEventContractStatus =
  | "NEGOCIANDO"
  | "ACORDADO"
  | "CANCELADO"
  | "COMPLETADO";

export interface OrganizerEventListItem {
  id: string;
  titulo: string;
  descripcion?: string | null;
  startsAt: string;
  endsAt: string;
  ubicacion: string;
  nombreLugar: string | null;
  ciudad: string | null;
  cantidadMusicosRequerida: number;
  cacheOfrecido?: number | null;
  /** Precio de la Entrada GENERAL; `null` si el evento histórico no tiene Entrada. */
  precioEntrada?: number | null;
  bannerUrl?: string | null;
  estado: OrganizerEventStatus;
  contrataciones: Array<{ estado: OrganizerEventContractStatus }>;
}

export function hasActiveEventContracts(event: OrganizerEventListItem) {
  return event.contrataciones.some(({ estado }) => estado === "NEGOCIANDO" || estado === "ACORDADO");
}

export interface OrganizerEventGroups {
  upcoming: OrganizerEventListItem[];
  finished: OrganizerEventListItem[];
  cancelled: OrganizerEventListItem[];
}

function compareByDate(
  first: OrganizerEventListItem,
  second: OrganizerEventListItem,
  direction: "asc" | "desc"
) {
  const dateDifference = new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
  if (dateDifference !== 0) {
    return direction === "asc" ? dateDifference : -dateDifference;
  }

  return first.id.localeCompare(second.id);
}

export function groupOrganizerEvents(
  events: OrganizerEventListItem[],
  now: Date = new Date()
): OrganizerEventGroups {
  const nowTime = now.getTime();
  const groups: OrganizerEventGroups = {
    upcoming: [],
    finished: [],
    cancelled: [],
  };

  for (const event of events) {
    if (event.estado === "CANCELADO") {
      groups.cancelled.push(event);
    } else if (new Date(event.endsAt).getTime() > nowTime) {
      groups.upcoming.push(event);
    } else {
      groups.finished.push(event);
    }
  }

  groups.upcoming.sort((first, second) => compareByDate(first, second, "asc"));
  groups.finished.sort((first, second) => compareByDate(first, second, "desc"));
  groups.cancelled.sort((first, second) => compareByDate(first, second, "desc"));

  return groups;
}

export function getConfirmedBandsCount(event: OrganizerEventListItem) {
  return calcularCupos({
    cantidadRequerida: event.cantidadMusicosRequerida,
    contrataciones: event.contrataciones,
  }).cuposOcupados;
}

export function canCancelOrganizerEvent(
  event: OrganizerEventListItem,
  now: Date = new Date()
) {
  return event.estado === "PUBLICADO" && new Date(event.startsAt).getTime() > now.getTime();
}
