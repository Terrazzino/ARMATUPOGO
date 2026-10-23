import { describe, expect, it } from "vitest";
import {
  getEventOpportunityState,
  getProjectOpportunityState,
} from "@/lib/musician-event-board";
import { calcularCupos } from "@/lib/cupos";

describe("cartelera especializada para músicos", () => {
  it("permite postular un proyecto sin relación previa", () => {
    expect(getProjectOpportunityState({
      projectId: "proyecto-1",
      postulations: [],
      contracts: [],
    })).toBe("DISPONIBLE");
  });

  it.each([
    ["PENDIENTE", "PENDIENTE"],
    ["ACEPTADA", "NEGOCIANDO"],
    ["RECHAZADA", "RECHAZADA"],
    ["CANCELADA", "CANCELADA"],
  ] as const)("representa una postulación %s", (estado, expected) => {
    expect(getProjectOpportunityState({
      projectId: "proyecto-1",
      postulations: [{ proyectoMusicalId: "proyecto-1", estado }],
      contracts: [],
    })).toBe(expected);
  });

  it("prioriza la contratación real sobre la postulación", () => {
    expect(getProjectOpportunityState({
      projectId: "proyecto-1",
      postulations: [{ proyectoMusicalId: "proyecto-1", estado: "ACEPTADA" }],
      contracts: [{ proyectoMusicalId: "proyecto-1", estado: "ACORDADO" }],
    })).toBe("CONFIRMADA");
  });

  it("distingue una participación completada de una banda confirmada", () => {
    expect(getProjectOpportunityState({
      projectId: "proyecto-1",
      postulations: [],
      contracts: [{ proyectoMusicalId: "proyecto-1", estado: "COMPLETADO" }],
    })).toBe("COMPLETADA");
  });

  it("calcula cada proyecto de un mismo músico de forma independiente", () => {
    const relations = {
      postulations: [{ proyectoMusicalId: "proyecto-1", estado: "PENDIENTE" as const }],
      contracts: [],
    };

    expect(getProjectOpportunityState({ ...relations, projectId: "proyecto-1" })).toBe("PENDIENTE");
    expect(getProjectOpportunityState({ ...relations, projectId: "proyecto-2" })).toBe("DISPONIBLE");
  });

  it("resume el estado más avanzado cuando hay múltiples proyectos", () => {
    expect(getEventOpportunityState({
      postulations: [
        { proyectoMusicalId: "proyecto-1", estado: "RECHAZADA" },
        { proyectoMusicalId: "proyecto-2", estado: "PENDIENTE" },
      ],
      contracts: [],
    })).toBe("PENDIENTE");
  });

  it("cuenta sólo acuerdos y contrataciones completadas como bandas confirmadas", () => {
    expect(calcularCupos({
      cantidadRequerida: 5,
      contrataciones: [
        { estado: "NEGOCIANDO" },
        { estado: "ACORDADO" },
        { estado: "COMPLETADO" },
        { estado: "CANCELADO" },
      ],
    })).toMatchObject({
      cuposOcupados: 2,
      cuposDisponibles: 3,
      hayCupoDisponible: true,
    });
  });
});
