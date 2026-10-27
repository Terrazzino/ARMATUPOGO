import { describe, expect, it } from "vitest";
import {
  formatAgreedAmount,
  getMusicianContractActionState,
  groupMusicianEngagements,
  MUSICIAN_ENGAGEMENT_EMPTY_MESSAGES,
  type MusicianContractStatus,
  type MusicianPostulationStatus,
} from "@/lib/musician-engagements";

const NOW = new Date("2026-05-02T15:00:00.000Z");

function contract(
  id: string,
  estado: MusicianContractStatus,
  startsAt: string,
  endsAt: string,
  options: {
    eventStatus?: "PUBLICADO" | "CANCELADO";
    postulacionId?: string | null;
  } = {}
) {
  return {
    id,
    estado,
    postulacionId: options.postulacionId,
    evento: {
      startsAt,
      endsAt,
      estado: options.eventStatus ?? "PUBLICADO",
    },
  };
}

function postulation(
  id: string,
  estado: MusicianPostulationStatus,
  startsAt: string,
  endsAt: string,
  eventStatus: "PUBLICADO" | "CANCELADO" = "PUBLICADO"
) {
  return { id, estado, evento: { startsAt, endsAt, estado: eventStatus } };
}

describe("fechas y contrataciones del músico", () => {
  const contracts = [
    contract("contrato-cancelado", "CANCELADO", "2026-01-01T20:00:00.000Z", "2026-01-01T23:00:00.000Z"),
    contract("contrato-negociando", "NEGOCIANDO", "2026-05-04T20:00:00.000Z", "2026-05-04T23:00:00.000Z"),
    contract("contrato-completado", "COMPLETADO", "2026-04-03T20:00:00.000Z", "2026-04-03T23:00:00.000Z"),
    contract("contrato-acordado-futuro-b", "ACORDADO", "2026-05-03T20:00:00.000Z", "2026-05-03T23:00:00.000Z"),
    contract("contrato-acordado-futuro-a", "ACORDADO", "2026-05-03T20:00:00.000Z", "2026-05-03T23:00:00.000Z"),
    contract("contrato-acordado-en-curso", "ACORDADO", "2026-05-02T14:00:00.000Z", "2026-05-02T18:00:00.000Z"),
    contract("contrato-acordado-vencido", "ACORDADO", "2026-04-02T20:00:00.000Z", "2026-04-02T23:00:00.000Z"),
    contract("contrato-evento-cancelado", "ACORDADO", "2026-05-05T20:00:00.000Z", "2026-05-05T23:00:00.000Z", { eventStatus: "CANCELADO" }),
  ];
  const postulations = [
    postulation("postulacion-pendiente", "PENDIENTE", "2026-05-03T18:00:00.000Z", "2026-05-03T19:00:00.000Z"),
    postulation("postulacion-vencida", "PENDIENTE", "2026-04-01T18:00:00.000Z", "2026-04-01T19:00:00.000Z"),
    postulation("postulacion-evento-cancelado", "PENDIENTE", "2026-05-06T18:00:00.000Z", "2026-05-06T19:00:00.000Z", "CANCELADO"),
    postulation("postulacion-rechazada", "RECHAZADA", "2026-05-01T19:00:00.000Z", "2026-05-01T22:00:00.000Z"),
    postulation("postulacion-cancelada", "CANCELADA", "2026-05-04T20:00:00.000Z", "2026-05-04T23:00:00.000Z"),
  ];

  it("separa acuerdos vigentes, pendientes vigentes y fechas finalizadas", () => {
    const result = groupMusicianEngagements(contracts, postulations, NOW);

    expect(result.confirmed.map(({ item }) => item.id)).toEqual([
      "contrato-acordado-en-curso",
      "contrato-acordado-futuro-a",
      "contrato-acordado-futuro-b",
    ]);
    expect(result.pending.map(({ item }) => item.id)).toEqual([
      "postulacion-pendiente",
      "contrato-negociando",
    ]);
    expect(result.finished.map(({ item }) => item.id)).toEqual([
      "contrato-acordado-vencido",
      "contrato-completado",
    ]);
  });

  it("excluye vencidas pendientes, canceladas y registros de eventos cancelados", () => {
    const result = groupMusicianEngagements(contracts, postulations, NOW);
    const visibleIds = [...result.confirmed, ...result.pending, ...result.finished]
      .map(({ item }) => item.id);

    expect(visibleIds).not.toContain("contrato-cancelado");
    expect(visibleIds).not.toContain("contrato-evento-cancelado");
    expect(visibleIds).not.toContain("postulacion-vencida");
    expect(visibleIds).not.toContain("postulacion-evento-cancelado");
    expect(visibleIds).not.toContain("postulacion-rechazada");
    expect(visibleIds).not.toContain("postulacion-cancelada");
  });

  it("ordena cronológicamente y usa el id como desempate estable", () => {
    const result = groupMusicianEngagements(contracts, postulations, NOW);

    expect(result.confirmed.slice(1).map(({ item }) => item.id)).toEqual([
      "contrato-acordado-futuro-a",
      "contrato-acordado-futuro-b",
    ]);
  });

  it("no duplica una postulación que ya tiene una contratación correspondiente", () => {
    const linkedPostulation = postulation(
      "postulacion-vinculada",
      "PENDIENTE",
      "2026-05-07T20:00:00.000Z",
      "2026-05-07T23:00:00.000Z"
    );
    const linkedContract = contract(
      "contrato-vinculado",
      "NEGOCIANDO",
      "2026-05-07T20:00:00.000Z",
      "2026-05-07T23:00:00.000Z",
      { postulacionId: linkedPostulation.id }
    );

    const result = groupMusicianEngagements([linkedContract], [linkedPostulation], NOW);

    expect(result.pending.map(({ item }) => item.id)).toEqual(["contrato-vinculado"]);
  });

  it("sólo presenta el monto definitivo para acuerdos y contratos completados", () => {
    expect(formatAgreedAmount("NEGOCIANDO", 150000)).toBe("Sin acuerdo");
    expect(formatAgreedAmount("PENDIENTE")).toBe("Sin acuerdo");
    expect(formatAgreedAmount("ACORDADO", null)).toBe("Sin acuerdo");
    expect(formatAgreedAmount("ACORDADO", 150000)).toBe("$150.000");
    expect(formatAgreedAmount("COMPLETADO", "82500")).toBe("$82.500");
  });

  it("presenta valoración sólo para contratos completados", () => {
    expect(getMusicianContractActionState("ACORDADO", false)).toBe("awaiting-event");
    expect(getMusicianContractActionState(
      "ACORDADO",
      false,
      "2026-05-01T20:00:00.000Z",
      NOW
    )).toBe("awaiting-completion");
    expect(getMusicianContractActionState("COMPLETADO", false)).toBe("rate-organizer");
    expect(getMusicianContractActionState("COMPLETADO", true)).toBe("already-rated");
  });

  it("conserva la negociación y no expone acciones para contratos cancelados", () => {
    expect(getMusicianContractActionState("NEGOCIANDO", false)).toBe("negotiation");
    expect(getMusicianContractActionState("CANCELADO", false)).toBe("unavailable");
  });

  it("define los mensajes vacíos de las tres pestañas", () => {
    expect(MUSICIAN_ENGAGEMENT_EMPTY_MESSAGES).toEqual({
      confirmed: "Todavía no tenés fechas confirmadas vigentes",
      pending: "No tenés postulaciones ni negociaciones pendientes",
      finished: "Todavía no tenés fechas finalizadas",
    });
  });
});
