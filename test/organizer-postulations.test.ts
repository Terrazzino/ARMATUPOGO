import { describe, expect, it } from "vitest";
import {
  getOrganizerPostulationActionState,
  groupOrganizerPostulations,
  type OrganizerPostulationListItem,
  type OrganizerPostulationStatus,
} from "@/lib/organizer-postulations";

function postulation(
  id: string,
  estado: OrganizerPostulationStatus,
  startsAt: string,
  contractId: string | null = null
): OrganizerPostulationListItem {
  return {
    id,
    estado,
    mensaje: null,
    creadoEn: "2026-10-01T12:00:00.000Z",
    evento: {
      id: `evento-${id}`,
      titulo: `Evento ${id}`,
      startsAt,
      estado: "PUBLICADO",
    },
    proyectoMusical: { id: `proyecto-${id}`, nombre: `Proyecto ${id}` },
    musico: { nombre: "Ada", apellido: "Lovelace" },
    contratacion: contractId ? { id: contractId } : null,
  };
}

describe("postulaciones recibidas del organizador", () => {
  it("clasifica por estado y excluye las canceladas", () => {
    const groups = groupOrganizerPostulations([
      postulation("pendiente", "PENDIENTE", "2026-11-01T20:00:00.000Z"),
      postulation("aceptada", "ACEPTADA", "2026-11-02T20:00:00.000Z", "contrato-1"),
      postulation("rechazada", "RECHAZADA", "2026-11-03T20:00:00.000Z"),
      postulation("cancelada", "CANCELADA", "2026-11-04T20:00:00.000Z"),
    ]);

    expect(groups.pending.map(({ id }) => id)).toEqual(["pendiente"]);
    expect(groups.accepted.map(({ id }) => id)).toEqual(["aceptada"]);
    expect(groups.rejected.map(({ id }) => id)).toEqual(["rechazada"]);
    expect(Object.values(groups).flat().map(({ id }) => id)).not.toContain("cancelada");
  });

  it("ordena pendientes ascendente y los historiales descendente", () => {
    const groups = groupOrganizerPostulations([
      postulation("pendiente-lejana", "PENDIENTE", "2026-11-10T20:00:00.000Z"),
      postulation("pendiente-cercana", "PENDIENTE", "2026-11-01T20:00:00.000Z"),
      postulation("aceptada-antigua", "ACEPTADA", "2026-09-01T20:00:00.000Z", "c-1"),
      postulation("aceptada-reciente", "ACEPTADA", "2026-10-01T20:00:00.000Z", "c-2"),
      postulation("rechazada-antigua", "RECHAZADA", "2026-08-01T20:00:00.000Z"),
      postulation("rechazada-reciente", "RECHAZADA", "2026-10-02T20:00:00.000Z"),
    ]);

    expect(groups.pending.map(({ id }) => id)).toEqual(["pendiente-cercana", "pendiente-lejana"]);
    expect(groups.accepted.map(({ id }) => id)).toEqual(["aceptada-reciente", "aceptada-antigua"]);
    expect(groups.rejected.map(({ id }) => id)).toEqual(["rechazada-reciente", "rechazada-antigua"]);
  });

  it("usa el id como desempate estable para fechas iguales", () => {
    const groups = groupOrganizerPostulations([
      postulation("postulacion-b", "PENDIENTE", "2026-11-01T20:00:00.000Z"),
      postulation("postulacion-a", "PENDIENTE", "2026-11-01T20:00:00.000Z"),
    ]);

    expect(groups.pending.map(({ id }) => id)).toEqual(["postulacion-a", "postulacion-b"]);
  });

  it("define acciones únicamente para estados compatibles", () => {
    expect(getOrganizerPostulationActionState(
      postulation("p", "PENDIENTE", "2026-11-01T20:00:00.000Z")
    )).toBe("review-and-resolve");
    expect(getOrganizerPostulationActionState(
      postulation("a", "ACEPTADA", "2026-11-01T20:00:00.000Z", "contrato-1")
    )).toBe("open-negotiation");
    expect(getOrganizerPostulationActionState(
      postulation("a-sin-contrato", "ACEPTADA", "2026-11-01T20:00:00.000Z")
    )).toBe("negotiation-unavailable");
    expect(getOrganizerPostulationActionState(
      postulation("r", "RECHAZADA", "2026-11-01T20:00:00.000Z")
    )).toBe("history");
    expect(getOrganizerPostulationActionState(
      postulation("c", "CANCELADA", "2026-11-01T20:00:00.000Z")
    )).toBe("hidden");
  });

  it("devuelve los tres grupos vacíos cuando no hay postulaciones", () => {
    expect(groupOrganizerPostulations([])).toEqual({
      pending: [],
      accepted: [],
      rejected: [],
    });
  });
});
