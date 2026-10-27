import { describe, expect, it } from "vitest";
import {
  canShowEventApplication,
  getEventApplicationDisabledReason,
  getEventDetailNavigation,
  getEventTemporalState,
  hasEventFlyer,
} from "@/lib/event-detail";

describe("detalle de eventos", () => {
  const now = new Date("2026-10-21T18:00:00.000Z");

  it("elige navegación pública o contextual según el rol", () => {
    expect(getEventDetailNavigation(null)).toEqual({
      variant: "public",
    });
    expect(getEventDetailNavigation("MUSICO")).toEqual({
      variant: "dashboard",
    });
    expect(getEventDetailNavigation("ORGANIZADOR")).toEqual({
      variant: "dashboard",
    });
  });

  it("mantiene identificable un evento pasado pero impide nuevas postulaciones", () => {
    const input = {
      status: "PUBLICADO" as const,
      startsAt: "2026-10-20T20:00:00.000Z",
      endsAt: "2026-10-20T23:00:00.000Z",
      confirmedCount: 1,
      requiredCount: 3,
      now,
    };

    expect(getEventTemporalState(input)).toBe("PAST");
    expect(getEventApplicationDisabledReason(input)).toContain("finalizó");
  });

  it("impide postulaciones a eventos cancelados", () => {
    expect(getEventApplicationDisabledReason({
      status: "CANCELADO",
      startsAt: "2026-10-22T20:00:00.000Z",
      endsAt: "2026-10-22T23:00:00.000Z",
      confirmedCount: 0,
      requiredCount: 3,
      now,
    })).toContain("cancelado");
  });

  it("impide postulaciones cuando los cupos están completos", () => {
    expect(getEventApplicationDisabledReason({
      status: "PUBLICADO",
      startsAt: "2026-10-22T20:00:00.000Z",
      endsAt: "2026-10-22T23:00:00.000Z",
      confirmedCount: 3,
      requiredCount: 3,
      now,
    })).toContain("cupos");
  });

  it("permite postular a un evento futuro publicado con cupos", () => {
    expect(getEventApplicationDisabledReason({
      status: "PUBLICADO",
      startsAt: "2026-10-22T20:00:00.000Z",
      endsAt: "2026-10-22T23:00:00.000Z",
      confirmedCount: 1,
      requiredCount: 3,
      now,
    })).toBeUndefined();
  });

  it("resuelve el flyer existente y el estado neutro sin imagen", () => {
    expect(hasEventFlyer("https://example.com/flyer.webp")).toBe(true);
    expect(hasEventFlyer(null)).toBe(false);
    expect(hasEventFlyer("   ")).toBe(false);
  });

  it("oculta una nueva postulación si el único proyecto ya está relacionado", () => {
    expect(canShowEventApplication(["PENDIENTE"])).toBe(false);
    expect(canShowEventApplication(["NEGOCIANDO"])).toBe(false);
    expect(canShowEventApplication(["CONFIRMADA"])).toBe(false);
    expect(canShowEventApplication(["COMPLETADA"])).toBe(false);
    expect(canShowEventApplication(["RECHAZADA"])).toBe(false);
    expect(canShowEventApplication(["CANCELADA"])).toBe(false);
  });

  it("permite postular otro proyecto elegible sin duplicar el ya relacionado", () => {
    expect(canShowEventApplication(["PENDIENTE", "DISPONIBLE"])).toBe(true);
  });

  it("oculta la acción aunque haya un proyecto disponible si el evento no acepta postulaciones", () => {
    expect(canShowEventApplication(
      ["DISPONIBLE"],
      "Este evento ya finalizó y no acepta postulaciones."
    )).toBe(false);
  });
});
