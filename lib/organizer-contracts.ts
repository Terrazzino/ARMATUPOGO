export type OrganizerContractStatus =
  | "NEGOCIANDO"
  | "ACORDADO"
  | "CANCELADO"
  | "COMPLETADO";

export interface OrganizerContractListItem {
  id: string;
  estado: OrganizerContractStatus;
  montoPactado: number | null;
  fechaAcuerdo: string | null;
  motivoCancelacion: string | null;
  hasCurrentUserRating: boolean;
  evento: {
    id: string;
    titulo: string;
    startsAt: string;
    endsAt: string;
    ubicacion: string;
    nombreLugar: string | null;
    ciudad: string | null;
    estado: "PUBLICADO" | "CANCELADO";
  };
  proyectoMusical: {
    id: string;
    nombre: string;
    genero: string;
  };
  organizador: {
    id: string;
    nombre: string;
    apellido: string;
  };
  musico: {
    id: string;
    nombre: string;
    apellido: string;
  };
  ofertas: Array<{
    id: string;
    monto: number;
    mensaje: string | null;
    estado: string;
    remitenteId: string;
    creadoEn: string;
  }>;
}

export interface OrganizerContractGroups {
  confirmed: OrganizerContractListItem[];
  pending: OrganizerContractListItem[];
}

export type OrganizerContractActionState =
  | "negotiation"
  | "awaiting-event"
  | "event-in-progress"
  | "complete"
  | "rate-musician"
  | "already-rated"
  | "hidden";

function compareDates(
  first: OrganizerContractListItem,
  second: OrganizerContractListItem,
  direction: "asc" | "desc"
) {
  const difference =
    new Date(first.evento.startsAt).getTime() - new Date(second.evento.startsAt).getTime();
  if (difference !== 0) return direction === "asc" ? difference : -difference;
  return first.id.localeCompare(second.id);
}

export function groupOrganizerContracts(
  contracts: OrganizerContractListItem[],
  now: Date = new Date()
): OrganizerContractGroups {
  const groups: OrganizerContractGroups = { confirmed: [], pending: [] };

  for (const contract of contracts) {
    if (contract.estado === "NEGOCIANDO") groups.pending.push(contract);
    if (contract.estado === "ACORDADO" || contract.estado === "COMPLETADO") {
      groups.confirmed.push(contract);
    }
  }

  groups.pending.sort((first, second) => compareDates(first, second, "asc"));
  groups.confirmed.sort((first, second) => {
    const firstIsHistory = new Date(first.evento.endsAt).getTime() <= now.getTime();
    const secondIsHistory = new Date(second.evento.endsAt).getTime() <= now.getTime();

    if (firstIsHistory !== secondIsHistory) return firstIsHistory ? 1 : -1;
    return compareDates(first, second, firstIsHistory ? "desc" : "asc");
  });

  return groups;
}

export function getOrganizerContractActionState(
  contract: OrganizerContractListItem,
  now: Date = new Date()
): OrganizerContractActionState {
  if (contract.estado === "NEGOCIANDO") return "negotiation";

  if (contract.estado === "ACORDADO") {
    if (new Date(contract.evento.endsAt).getTime() <= now.getTime()) return "complete";
    if (new Date(contract.evento.startsAt).getTime() <= now.getTime()) return "event-in-progress";
    return "awaiting-event";
  }

  if (contract.estado === "COMPLETADO") {
    return contract.hasCurrentUserRating ? "already-rated" : "rate-musician";
  }

  return "hidden";
}
