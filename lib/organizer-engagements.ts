import type { OrganizerContractListItem } from "@/lib/organizer-contracts";
import type { OrganizerPostulationListItem } from "@/lib/organizer-postulations";

export type OrganizerEngagement =
  | { kind: "postulation"; item: OrganizerPostulationListItem }
  | { kind: "contract"; item: OrganizerContractListItem };

export interface OrganizerEngagementGroups {
  review: OrganizerEngagement[];
  negotiating: OrganizerEngagement[];
  confirmed: OrganizerEngagement[];
  finished: OrganizerEngagement[];
  history: OrganizerEngagement[];
}

function compareByEventDate(first: OrganizerEngagement, second: OrganizerEngagement) {
  const difference = new Date(first.item.evento.startsAt).getTime()
    - new Date(second.item.evento.startsAt).getTime();
  return difference || first.item.id.localeCompare(second.item.id);
}

export function groupOrganizerEngagements(
  postulations: OrganizerPostulationListItem[],
  contracts: OrganizerContractListItem[],
  now: Date = new Date()
): OrganizerEngagementGroups {
  const groups: OrganizerEngagementGroups = {
    review: [],
    negotiating: [],
    confirmed: [],
    finished: [],
    history: [],
  };
  const nowTime = now.getTime();

  for (const postulation of postulations) {
    // Una postulación aceptada con contrato ya está representada por ese contrato.
    if (postulation.estado === "ACEPTADA" && postulation.contratacion) continue;

    const eventIsCurrent = postulation.evento.estado === "PUBLICADO"
      && new Date(postulation.evento.endsAt).getTime() > nowTime;

    if (postulation.estado === "PENDIENTE" && eventIsCurrent) {
      groups.review.push({ kind: "postulation", item: postulation });
    } else {
      groups.history.push({ kind: "postulation", item: postulation });
    }
  }

  for (const contract of contracts) {
    const eventIsPublished = contract.evento.estado === "PUBLICADO";
    const eventHasEnded = new Date(contract.evento.endsAt).getTime() <= nowTime;

    if (contract.estado === "NEGOCIANDO" && eventIsPublished && !eventHasEnded) {
      groups.negotiating.push({ kind: "contract", item: contract });
    } else if (contract.estado === "ACORDADO" && eventIsPublished && !eventHasEnded) {
      groups.confirmed.push({ kind: "contract", item: contract });
    } else if (
      eventIsPublished
      && (contract.estado === "COMPLETADO" || (contract.estado === "ACORDADO" && eventHasEnded))
    ) {
      groups.finished.push({ kind: "contract", item: contract });
    } else {
      groups.history.push({ kind: "contract", item: contract });
    }
  }

  Object.values(groups).forEach((group) => group.sort(compareByEventDate));
  return groups;
}
