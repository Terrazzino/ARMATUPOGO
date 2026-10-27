import { describe, expect, it } from "vitest";
import { groupOrganizerEngagements } from "@/lib/organizer-engagements";
import type { OrganizerContractListItem, OrganizerContractStatus } from "@/lib/organizer-contracts";
import type { OrganizerPostulationListItem, OrganizerPostulationStatus } from "@/lib/organizer-postulations";

const NOW = new Date("2026-10-21T12:00:00.000Z");

function postulation(
  id: string,
  estado: OrganizerPostulationStatus,
  startsAt: string,
  endsAt: string,
  options: { eventStatus?: "PUBLICADO" | "CANCELADO"; contractId?: string | null } = {}
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
      endsAt,
      estado: options.eventStatus ?? "PUBLICADO",
    },
    proyectoMusical: { id: `proyecto-${id}`, nombre: `Proyecto ${id}` },
    musico: { nombre: "Ada", apellido: "Lovelace" },
    contratacion: options.contractId ? { id: options.contractId } : null,
  };
}

function contract(
  id: string,
  estado: OrganizerContractStatus,
  startsAt: string,
  endsAt: string,
  eventStatus: "PUBLICADO" | "CANCELADO" = "PUBLICADO"
): OrganizerContractListItem {
  return {
    id,
    estado,
    montoPactado: estado === "NEGOCIANDO" ? null : 100000,
    fechaAcuerdo: null,
    motivoCancelacion: null,
    hasCurrentUserRating: false,
    evento: {
      id: `evento-${id}`,
      titulo: `Evento ${id}`,
      startsAt,
      endsAt,
      ubicacion: "Av. Siempre Viva 123",
      nombreLugar: "Sala Uno",
      ciudad: "Buenos Aires",
      estado: eventStatus,
    },
    proyectoMusical: { id: `proyecto-${id}`, nombre: `Proyecto ${id}`, genero: "Rock" },
    organizador: { id: "organizador-1", nombre: "Grace", apellido: "Hopper" },
    musico: { id: "musico-1", nombre: "Ada", apellido: "Lovelace" },
    ofertas: [],
  };
}

describe("flujo unificado de postulaciones y contrataciones del organizador", () => {
  it("clasifica cada etapa vigente sin duplicar postulaciones aceptadas", () => {
    const groups = groupOrganizerEngagements(
      [
        postulation("por-revisar", "PENDIENTE", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
        postulation("aceptada", "ACEPTADA", "2026-10-23T20:00:00.000Z", "2026-10-23T23:00:00.000Z", { contractId: "negociando" }),
      ],
      [
        contract("negociando", "NEGOCIANDO", "2026-10-23T20:00:00.000Z", "2026-10-23T23:00:00.000Z"),
        contract("confirmado", "ACORDADO", "2026-10-24T20:00:00.000Z", "2026-10-24T23:00:00.000Z"),
      ],
      NOW
    );

    expect(groups.review.map(({ item }) => item.id)).toEqual(["por-revisar"]);
    expect(groups.negotiating.map(({ item }) => item.id)).toEqual(["negociando"]);
    expect(groups.confirmed.map(({ item }) => item.id)).toEqual(["confirmado"]);
    expect(Object.values(groups).flat().map(({ item }) => item.id)).not.toContain("aceptada");
  });

  it("mantiene acuerdos en curso y separa acuerdos vencidos de completados", () => {
    const groups = groupOrganizerEngagements([], [
      contract("en-curso", "ACORDADO", "2026-10-21T10:00:00.000Z", "2026-10-21T14:00:00.000Z"),
      contract("pendiente-finalizar", "ACORDADO", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      contract("completado", "COMPLETADO", "2026-10-19T20:00:00.000Z", "2026-10-19T23:00:00.000Z"),
    ], NOW);

    expect(groups.confirmed.map(({ item }) => item.id)).toEqual(["en-curso"]);
    expect(groups.finished.map(({ item }) => item.id)).toEqual(["completado", "pendiente-finalizar"]);
  });

  it("envía pendientes vencidas, cancelaciones y eventos cancelados al historial", () => {
    const groups = groupOrganizerEngagements(
      [
        postulation("pendiente-vencida", "PENDIENTE", "2026-10-18T20:00:00.000Z", "2026-10-18T23:00:00.000Z"),
        postulation("rechazada", "RECHAZADA", "2026-10-19T20:00:00.000Z", "2026-10-19T23:00:00.000Z"),
        postulation("cancelada", "CANCELADA", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      ],
      [
        contract("negociacion-vencida", "NEGOCIANDO", "2026-10-17T20:00:00.000Z", "2026-10-17T23:00:00.000Z"),
        contract("contrato-cancelado", "CANCELADO", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
        contract("evento-cancelado", "ACORDADO", "2026-10-23T20:00:00.000Z", "2026-10-23T23:00:00.000Z", "CANCELADO"),
      ],
      NOW
    );

    expect(groups.history.map(({ item }) => item.id)).toEqual([
      "negociacion-vencida",
      "pendiente-vencida",
      "rechazada",
      "cancelada",
      "contrato-cancelado",
      "evento-cancelado",
    ]);
  });

  it("ordena cronológicamente y usa el id como desempate", () => {
    const groups = groupOrganizerEngagements([
      postulation("postulacion-b", "PENDIENTE", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      postulation("postulacion-a", "PENDIENTE", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
    ], [], NOW);

    expect(groups.review.map(({ item }) => item.id)).toEqual(["postulacion-a", "postulacion-b"]);
  });

  it("devuelve todas las pestañas vacías sin actividad", () => {
    expect(groupOrganizerEngagements([], [], NOW)).toEqual({
      review: [],
      negotiating: [],
      confirmed: [],
      finished: [],
      history: [],
    });
  });
});
