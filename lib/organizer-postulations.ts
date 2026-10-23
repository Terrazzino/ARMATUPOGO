export type OrganizerPostulationStatus =
  | "PENDIENTE"
  | "ACEPTADA"
  | "RECHAZADA"
  | "CANCELADA";

export interface OrganizerPostulationListItem {
  id: string;
  estado: OrganizerPostulationStatus;
  mensaje: string | null;
  creadoEn: string;
  evento: {
    id: string;
    titulo: string;
    startsAt: string;
    estado: "PUBLICADO" | "CANCELADO";
  };
  proyectoMusical: {
    id: string;
    nombre: string;
  };
  musico: {
    nombre: string;
    apellido: string;
  };
  contratacion: { id: string } | null;
}

export interface OrganizerPostulationGroups {
  pending: OrganizerPostulationListItem[];
  accepted: OrganizerPostulationListItem[];
  rejected: OrganizerPostulationListItem[];
}

export type OrganizerPostulationActionState =
  | "review-and-resolve"
  | "open-negotiation"
  | "negotiation-unavailable"
  | "history"
  | "hidden";

function compareByEventDate(
  first: OrganizerPostulationListItem,
  second: OrganizerPostulationListItem,
  direction: "asc" | "desc"
) {
  const difference =
    new Date(first.evento.startsAt).getTime() - new Date(second.evento.startsAt).getTime();
  if (difference !== 0) return direction === "asc" ? difference : -difference;
  return first.id.localeCompare(second.id);
}

export function groupOrganizerPostulations(
  postulations: OrganizerPostulationListItem[]
): OrganizerPostulationGroups {
  const groups: OrganizerPostulationGroups = {
    pending: [],
    accepted: [],
    rejected: [],
  };

  for (const postulation of postulations) {
    if (postulation.estado === "PENDIENTE") groups.pending.push(postulation);
    if (postulation.estado === "ACEPTADA") groups.accepted.push(postulation);
    if (postulation.estado === "RECHAZADA") groups.rejected.push(postulation);
  }

  groups.pending.sort((first, second) => compareByEventDate(first, second, "asc"));
  groups.accepted.sort((first, second) => compareByEventDate(first, second, "desc"));
  groups.rejected.sort((first, second) => compareByEventDate(first, second, "desc"));

  return groups;
}

export function getOrganizerPostulationActionState(
  postulation: OrganizerPostulationListItem
): OrganizerPostulationActionState {
  if (postulation.estado === "PENDIENTE") return "review-and-resolve";
  if (postulation.estado === "ACEPTADA") {
    return postulation.contratacion ? "open-negotiation" : "negotiation-unavailable";
  }
  if (postulation.estado === "RECHAZADA") return "history";
  return "hidden";
}
