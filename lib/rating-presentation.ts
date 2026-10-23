import { calcularReputacion } from "@/lib/valoraciones";

export type RatingActionState = "eligible" | "already-rated" | "unavailable";

export function getVisibleRatingValue(
  selectedValue: number | null,
  previewValue: number | null
) {
  return previewValue ?? selectedValue ?? 0;
}

export function getRatingActionState(input: {
  contractStatus: string;
  isParticipant: boolean;
  hasPreviousRating: boolean;
}): RatingActionState {
  if (!input.isParticipant || input.contractStatus !== "COMPLETADO") {
    return "unavailable";
  }

  return input.hasPreviousRating ? "already-rated" : "eligible";
}

export function getProjectReputationPresentation<
  T extends { puntaje: number },
>(ratings: T[]) {
  const { total, promedio: averageScore } = calcularReputacion(ratings);

  return { total, averageScore, ratings };
}
