import type { EstadoContratacion, EstadoPostulacion } from "@/lib/types";

export type MusicianOpportunityState =
  | "DISPONIBLE"
  | "PENDIENTE"
  | "NEGOCIANDO"
  | "CONFIRMADA"
  | "COMPLETADA"
  | "RECHAZADA"
  | "CANCELADA";

interface ProjectRelation {
  proyectoMusicalId: string;
}

interface ProjectPostulation extends ProjectRelation {
  estado: EstadoPostulacion;
}

interface ProjectContract extends ProjectRelation {
  estado: EstadoContratacion;
}

export const musicianOpportunityLabels: Record<MusicianOpportunityState, string> = {
  DISPONIBLE: "Puede postularse",
  PENDIENTE: "Postulación pendiente",
  NEGOCIANDO: "En negociación",
  CONFIRMADA: "Banda confirmada",
  COMPLETADA: "Participación completada",
  RECHAZADA: "Postulación rechazada",
  CANCELADA: "Postulación cancelada",
};

export function getProjectOpportunityState(params: {
  projectId: string;
  postulations: ProjectPostulation[];
  contracts: ProjectContract[];
}): MusicianOpportunityState {
  const contract = params.contracts.find(
    (item) => item.proyectoMusicalId === params.projectId
  );

  if (contract?.estado === "COMPLETADO") return "COMPLETADA";
  if (contract?.estado === "ACORDADO") return "CONFIRMADA";
  if (contract?.estado === "NEGOCIANDO") return "NEGOCIANDO";
  if (contract?.estado === "CANCELADO") return "CANCELADA";

  const postulation = params.postulations.find(
    (item) => item.proyectoMusicalId === params.projectId
  );

  switch (postulation?.estado) {
    case "PENDIENTE":
      return "PENDIENTE";
    case "ACEPTADA":
      return "NEGOCIANDO";
    case "RECHAZADA":
      return "RECHAZADA";
    case "CANCELADA":
      return "CANCELADA";
    default:
      return "DISPONIBLE";
  }
}

export function getEventOpportunityState(params: {
  postulations: ProjectPostulation[];
  contracts: ProjectContract[];
}): MusicianOpportunityState {
  const states = new Set<MusicianOpportunityState>();
  const projectIds = new Set([
    ...params.postulations.map((item) => item.proyectoMusicalId),
    ...params.contracts.map((item) => item.proyectoMusicalId),
  ]);

  projectIds.forEach((projectId) => {
    states.add(getProjectOpportunityState({ ...params, projectId }));
  });

  const priority: MusicianOpportunityState[] = [
    "COMPLETADA",
    "CONFIRMADA",
    "NEGOCIANDO",
    "PENDIENTE",
    "RECHAZADA",
    "CANCELADA",
  ];

  return priority.find((state) => states.has(state)) ?? "DISPONIBLE";
}
