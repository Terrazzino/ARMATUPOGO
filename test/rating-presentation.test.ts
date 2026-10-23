import { describe, expect, it } from "vitest";
import {
  getProjectReputationPresentation,
  getRatingActionState,
  getVisibleRatingValue,
} from "@/lib/rating-presentation";

describe("presentación de valoraciones", () => {
  it("comienza sin puntuación activa", () => {
    expect(getVisibleRatingValue(null, null)).toBe(0);
  });

  it.each([1, 2, 3, 4, 5])("representa la selección válida %i de 5", (score) => {
    expect(getVisibleRatingValue(score, null)).toBe(score);
  });

  it("muestra la vista previa y luego recupera la selección existente", () => {
    expect(getVisibleRatingValue(2, 4)).toBe(4);
    expect(getVisibleRatingValue(2, null)).toBe(2);
  });

  it("habilita la acción sólo para un participante de un contrato completado sin valoración previa", () => {
    expect(getRatingActionState({
      contractStatus: "COMPLETADO",
      isParticipant: true,
      hasPreviousRating: false,
    })).toBe("eligible");
  });

  it("reutiliza el estado previo e impide una segunda valoración", () => {
    expect(getRatingActionState({
      contractStatus: "COMPLETADO",
      isParticipant: true,
      hasPreviousRating: true,
    })).toBe("already-rated");
  });

  it.each(["ACORDADO", "NEGOCIANDO", "CANCELADO"])(
    "no expone la acción para una contratación %s",
    (contractStatus) => {
      expect(getRatingActionState({
        contractStatus,
        isParticipant: true,
        hasPreviousRating: false,
      })).toBe("unavailable");
    }
  );

  it("no habilita la acción para una persona ajena al contrato", () => {
    expect(getRatingActionState({
      contractStatus: "COMPLETADO",
      isParticipant: false,
      hasPreviousRating: false,
    })).toBe("unavailable");
  });

  it("presenta la reputación sin alterar promedio, total ni orden del historial", () => {
    const ratings = [
      { id: "reciente", puntaje: 5 },
      { id: "intermedia", puntaje: 4 },
      { id: "anterior", puntaje: 4 },
    ];

    expect(getProjectReputationPresentation(ratings)).toEqual({
      total: 3,
      averageScore: 4.3,
      ratings,
    });
  });

  it("presenta una reputación vacía de forma consistente", () => {
    expect(getProjectReputationPresentation([])).toEqual({
      total: 0,
      averageScore: 0,
      ratings: [],
    });
  });
});
