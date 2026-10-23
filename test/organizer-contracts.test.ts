import { describe, expect, it } from "vitest";
import {
  getOrganizerContractActionState,
  groupOrganizerContracts,
  type OrganizerContractListItem,
  type OrganizerContractStatus,
} from "@/lib/organizer-contracts";

const now = new Date("2026-10-21T12:00:00.000Z");

function contract(
  id: string,
  estado: OrganizerContractStatus,
  startsAt: string,
  endsAt: string,
  hasCurrentUserRating = false
): OrganizerContractListItem {
  return {
    id,
    estado,
    montoPactado: estado === "NEGOCIANDO" ? null : 150000,
    fechaAcuerdo: null,
    motivoCancelacion: null,
    hasCurrentUserRating,
    evento: {
      id: `evento-${id}`,
      titulo: `Evento ${id}`,
      startsAt,
      endsAt,
      ubicacion: "Av. Siempre Viva 123",
      nombreLugar: "Sala Uno",
      ciudad: "Buenos Aires",
      estado: "PUBLICADO",
    },
    proyectoMusical: { id: `proyecto-${id}`, nombre: `Proyecto ${id}`, genero: "Rock" },
    organizador: { id: "organizador-1", nombre: "Grace", apellido: "Hopper" },
    musico: { id: "musico-1", nombre: "Ada", apellido: "Lovelace" },
    ofertas: [],
  };
}

describe("negociaciones y contrataciones del organizador", () => {
  it("clasifica confirmadas y pendientes y excluye canceladas", () => {
    const groups = groupOrganizerContracts([
      contract("negociando", "NEGOCIANDO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      contract("acordado", "ACORDADO", "2026-10-23T20:00:00.000Z", "2026-10-23T23:00:00.000Z"),
      contract("completado", "COMPLETADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      contract("cancelado", "CANCELADO", "2026-10-24T20:00:00.000Z", "2026-10-24T23:00:00.000Z"),
    ], now);

    expect(groups.pending.map(({ id }) => id)).toEqual(["negociando"]);
    expect(groups.confirmed.map(({ id }) => id)).toEqual(["acordado", "completado"]);
    expect(Object.values(groups).flat().map(({ id }) => id)).not.toContain("cancelado");
  });

  it("prioriza acuerdos próximos ascendentes y luego el historial descendente", () => {
    const groups = groupOrganizerContracts([
      contract("proximo-lejano", "ACORDADO", "2026-10-25T20:00:00.000Z", "2026-10-25T23:00:00.000Z"),
      contract("historial-antiguo", "COMPLETADO", "2026-09-10T20:00:00.000Z", "2026-09-10T23:00:00.000Z"),
      contract("proximo-cercano", "ACORDADO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      contract("historial-reciente", "COMPLETADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
    ], now);

    expect(groups.confirmed.map(({ id }) => id)).toEqual([
      "proximo-cercano",
      "proximo-lejano",
      "historial-reciente",
      "historial-antiguo",
    ]);
  });

  it("ordena negociaciones por fecha ascendente y usa el id como desempate", () => {
    const groups = groupOrganizerContracts([
      contract("pendiente-b", "NEGOCIANDO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      contract("pendiente-a", "NEGOCIANDO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      contract("pendiente-lejana", "NEGOCIANDO", "2026-10-24T20:00:00.000Z", "2026-10-24T23:00:00.000Z"),
    ], now);

    expect(groups.pending.map(({ id }) => id)).toEqual([
      "pendiente-a",
      "pendiente-b",
      "pendiente-lejana",
    ]);
  });

  it("habilita negociación, finalización y valoración sólo en estados válidos", () => {
    expect(getOrganizerContractActionState(
      contract("n", "NEGOCIANDO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      now
    )).toBe("negotiation");
    expect(getOrganizerContractActionState(
      contract("futuro", "ACORDADO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      now
    )).toBe("awaiting-event");
    expect(getOrganizerContractActionState(
      contract("curso", "ACORDADO", "2026-10-21T10:00:00.000Z", "2026-10-21T14:00:00.000Z"),
      now
    )).toBe("event-in-progress");
    expect(getOrganizerContractActionState(
      contract("finalizable", "ACORDADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      now
    )).toBe("complete");
    expect(getOrganizerContractActionState(
      contract("valorable", "COMPLETADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      now
    )).toBe("rate-musician");
    expect(getOrganizerContractActionState(
      contract("valorado", "COMPLETADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z", true),
      now
    )).toBe("already-rated");
  });

  it("devuelve ambas pestañas vacías cuando no hay contrataciones", () => {
    expect(groupOrganizerContracts([], now)).toEqual({ confirmed: [], pending: [] });
  });
});
