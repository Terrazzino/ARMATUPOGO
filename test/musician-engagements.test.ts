import { describe, expect, it } from "vitest";
import {
  formatAgreedAmount,
  getMusicianContractActionState,
  groupMusicianEngagements,
  type MusicianContractStatus,
  type MusicianPostulationStatus,
} from "@/lib/musician-engagements";

function contract(id: string, estado: MusicianContractStatus, startsAt: string) {
  return { id, estado, evento: { startsAt } };
}

function postulation(id: string, estado: MusicianPostulationStatus, startsAt: string) {
  return { id, estado, evento: { startsAt } };
}

describe("fechas y contrataciones del músico", () => {
  const contracts = [
    contract("contrato-cancelado", "CANCELADO", "2026-01-01T20:00:00.000Z"),
    contract("contrato-negociando", "NEGOCIANDO", "2026-05-02T20:00:00.000Z"),
    contract("contrato-completado", "COMPLETADO", "2026-05-03T20:00:00.000Z"),
    contract("contrato-acordado-b", "ACORDADO", "2026-05-01T20:00:00.000Z"),
    contract("contrato-acordado-a", "ACORDADO", "2026-05-01T20:00:00.000Z"),
  ];
  const postulations = [
    postulation("postulacion-pendiente", "PENDIENTE", "2026-05-01T18:00:00.000Z"),
    postulation("postulacion-rechazada", "RECHAZADA", "2026-05-01T19:00:00.000Z"),
    postulation("postulacion-cancelada", "CANCELADA", "2026-05-04T20:00:00.000Z"),
  ];

  it("separa confirmadas y pendientes sin mezclar estados", () => {
    const result = groupMusicianEngagements(contracts, postulations);

    expect(result.confirmed.map(({ item }) => item.id)).toEqual([
      "contrato-acordado-a",
      "contrato-acordado-b",
      "contrato-completado",
    ]);
    expect(result.pending.map(({ item }) => item.id)).toEqual([
      "postulacion-pendiente",
      "contrato-negociando",
    ]);
  });

  it("excluye contrataciones canceladas y postulaciones rechazadas o canceladas", () => {
    const result = groupMusicianEngagements(contracts, postulations);
    const visibleIds = [...result.confirmed, ...result.pending].map(({ item }) => item.id);

    expect(visibleIds).not.toContain("contrato-cancelado");
    expect(visibleIds).not.toContain("postulacion-rechazada");
    expect(visibleIds).not.toContain("postulacion-cancelada");
  });

  it("ordena cronológicamente y usa el id como desempate estable", () => {
    const result = groupMusicianEngagements(contracts, postulations);

    expect(result.confirmed.slice(0, 2).map(({ item }) => item.id)).toEqual([
      "contrato-acordado-a",
      "contrato-acordado-b",
    ]);
  });

  it("sólo presenta el monto definitivo para acuerdos y contratos completados", () => {
    expect(formatAgreedAmount("NEGOCIANDO", 150000)).toBe("Sin acuerdo");
    expect(formatAgreedAmount("PENDIENTE")).toBe("Sin acuerdo");
    expect(formatAgreedAmount("ACORDADO", null)).toBe("Sin acuerdo");
    expect(formatAgreedAmount("ACORDADO", 150000)).toBe("$150.000");
    expect(formatAgreedAmount("COMPLETADO", "82500")).toBe("$82.500");
  });

  it("presenta la acción correcta para los tres estados de una contratación confirmada", () => {
    expect(getMusicianContractActionState("ACORDADO", false)).toBe("awaiting-event");
    expect(getMusicianContractActionState("COMPLETADO", false)).toBe("rate-organizer");
    expect(getMusicianContractActionState("COMPLETADO", true)).toBe("already-rated");
  });

  it("conserva la negociación y no expone acciones para contratos cancelados", () => {
    expect(getMusicianContractActionState("NEGOCIANDO", false)).toBe("negotiation");
    expect(getMusicianContractActionState("CANCELADO", false)).toBe("unavailable");
  });
});
