import { describe, expect, it } from "vitest";
import { EVENT_CANCELLATION_BY_ORGANIZER_REASON } from "@/lib/constants";
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
    fechaAcuerdo?: string | null;
    montoPactado?: number | null;
    motivoCancelacion?: string | null;
  } = {}
) {
  return {
    id,
    estado,
    postulacionId: options.postulacionId,
    fechaAcuerdo: options.fechaAcuerdo !== undefined ? options.fechaAcuerdo : null,
    montoPactado: options.montoPactado !== undefined ? options.montoPactado : null,
    motivoCancelacion:
      options.motivoCancelacion !== undefined
        ? options.motivoCancelacion
        : (options.eventStatus === "CANCELADO" && options.fechaAcuerdo
            ? EVENT_CANCELLATION_BY_ORGANIZER_REASON
            : null),
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

  it("sólo presenta el monto definitivo para acuerdos y contratos completados o cancelados", () => {
    expect(formatAgreedAmount("NEGOCIANDO", 150000)).toBe("Sin acuerdo");
    expect(formatAgreedAmount("PENDIENTE")).toBe("Sin acuerdo");
    expect(formatAgreedAmount("ACORDADO", null)).toBe("Monto no informado");
    expect(formatAgreedAmount("ACORDADO", 150000)).toBe("$150.000");
    expect(formatAgreedAmount("COMPLETADO", "82500")).toBe("$82.500");
    expect(formatAgreedAmount("COMPLETADO", null)).toBe("Monto no informado");
    expect(formatAgreedAmount("CANCELADO", 200000)).toBe("$200.000");
    expect(formatAgreedAmount("CANCELADO", null)).toBe("Monto no informado");
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

  it("define los mensajes vacíos de las cuatro pestañas", () => {
    expect(MUSICIAN_ENGAGEMENT_EMPTY_MESSAGES).toEqual({
      confirmed: "Todavía no tenés fechas confirmadas vigentes",
      pending: "No tenés postulaciones ni negociaciones pendientes",
      finished: "Todavía no tenés fechas finalizadas",
      cancelled: "Todavía no tenés fechas canceladas",
    });
  });

  describe("historial de fechas canceladas para el músico", () => {
    it("Caso 1: Evento CANCELADO con contrato cancelado y acuerdo previo aparece en cancelled", () => {
      const c = contract(
        "fecha-cancelada-confirmada",
        "CANCELADO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-05-10T12:00:00.000Z",
          montoPactado: 120000,
        }
      );

      const result = groupMusicianEngagements([c], [], NOW);

      expect(result.cancelled.map(({ item }) => item.id)).toEqual(["fecha-cancelada-confirmada"]);
      expect(result.confirmed).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
    });

    it("Caso 2: Evento CANCELADO con contrato sin acuerdo previo (fechaAcuerdo null) NO aparece en cancelled", () => {
      const c = contract(
        "evento-cancelado-sin-acuerdo",
        "CANCELADO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: null,
        }
      );

      const result = groupMusicianEngagements([c], [], NOW);

      expect(result.cancelled).toHaveLength(0);
      expect(result.confirmed).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
    });

    it("Caso 3: Contrato CANCELADO con evento PUBLICADO (baja individual) NO aparece en cancelled", () => {
      const c = contract(
        "baja-individual-contrato",
        "CANCELADO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "PUBLICADO",
          fechaAcuerdo: "2026-05-10T12:00:00.000Z",
        }
      );

      const result = groupMusicianEngagements([c], [], NOW);

      expect(result.cancelled).toHaveLength(0);
      expect(result.confirmed).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
    });

    it("Caso 4: Evento cancelado de otro escenario sin acuerdo no contamina ningún grupo", () => {
      const c = contract(
        "evento-cancelado-negociando",
        "NEGOCIANDO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: null,
        }
      );
      const p = postulation(
        "postulacion-evento-cancelado",
        "PENDIENTE",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        "CANCELADO"
      );

      const result = groupMusicianEngagements([c], [p], NOW);

      expect(result.confirmed).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
      expect(result.cancelled).toHaveLength(0);
    });

    it("Caso 5: Varias fechas canceladas quedan ordenadas por evento.startsAt descendente", () => {
      const fechaAntigua = contract(
        "cancelada-antigua",
        "CANCELADO",
        "2026-05-01T20:00:00.000Z",
        "2026-05-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-04-10T12:00:00.000Z",
        }
      );
      const fechaReciente = contract(
        "cancelada-reciente",
        "CANCELADO",
        "2026-07-15T20:00:00.000Z",
        "2026-07-15T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-04-12T12:00:00.000Z",
        }
      );
      const fechaIntermedia = contract(
        "cancelada-intermedia",
        "CANCELADO",
        "2026-06-10T20:00:00.000Z",
        "2026-06-10T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-04-11T12:00:00.000Z",
        }
      );

      const result = groupMusicianEngagements(
        [fechaAntigua, fechaReciente, fechaIntermedia],
        [],
        NOW
      );

      expect(result.cancelled.map(({ item }) => item.id)).toEqual([
        "cancelada-reciente",
        "cancelada-intermedia",
        "cancelada-antigua",
      ]);
    });

    it("Caso 6: montoPactado null pero fechaAcuerdo != null sigue apareciendo en cancelled con monto no informado", () => {
      const c = contract(
        "cancelada-sin-monto",
        "CANCELADO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-05-01T10:00:00.000Z",
          montoPactado: null,
        }
      );

      const result = groupMusicianEngagements([c], [], NOW);

      expect(result.cancelled.map(({ item }) => item.id)).toEqual(["cancelada-sin-monto"]);
      expect(formatAgreedAmount(c.estado, c.montoPactado)).toBe("Monto no informado");
    });

    it("Caso 7: Empty state de cancelled cuando no hay fechas canceladas", () => {
      const result = groupMusicianEngagements([], [], NOW);

      expect(result.cancelled).toEqual([]);
      expect(MUSICIAN_ENGAGEMENT_EMPTY_MESSAGES.cancelled).toBe(
        "Todavía no tenés fechas canceladas"
      );
    });

    it("Caso 8: Contrato acordado cancelado individualmente antes de la cancelación del evento NO aparece en cancelled", () => {
      const bajaIndividualPrevia = contract(
        "baja-individual-previa",
        "CANCELADO",
        "2026-06-01T20:00:00.000Z",
        "2026-06-01T23:00:00.000Z",
        {
          eventStatus: "CANCELADO",
          fechaAcuerdo: "2026-05-01T10:00:00.000Z",
          motivoCancelacion: "Baja individual del músico por motivos personales",
        }
      );

      const result = groupMusicianEngagements([bajaIndividualPrevia], [], NOW);

      expect(result.cancelled).toHaveLength(0);
      expect(result.confirmed).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(result.finished).toHaveLength(0);
    });
  });
});
