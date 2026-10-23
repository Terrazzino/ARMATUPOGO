import { describe, expect, it } from "vitest";
import {
  getConfirmedBandsCount,
  groupOrganizerEvents,
  type OrganizerEventListItem,
} from "@/lib/organizer-events";

const now = new Date("2026-10-21T12:00:00.000Z");

function event(
  id: string,
  startsAt: string,
  endsAt: string,
  estado: OrganizerEventListItem["estado"] = "PUBLICADO"
): OrganizerEventListItem {
  return {
    id,
    titulo: `Evento ${id}`,
    startsAt,
    endsAt,
    ubicacion: "Av. Siempre Viva 123",
    nombreLugar: "Sala Uno",
    ciudad: "Buenos Aires",
    cantidadMusicosRequerida: 5,
    estado,
    contrataciones: [],
  };
}

describe("eventos del panel del organizador", () => {
  it("clasifica por finalización real y separa los cancelados", () => {
    const groups = groupOrganizerEvents([
      event("proximo", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      event("en-curso", "2026-10-21T10:00:00.000Z", "2026-10-21T14:00:00.000Z"),
      event("finalizado", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      event("cancelado", "2026-10-23T20:00:00.000Z", "2026-10-23T23:00:00.000Z", "CANCELADO"),
    ], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["en-curso", "proximo"]);
    expect(groups.finished.map(({ id }) => id)).toEqual(["finalizado"]);
    expect(groups.cancelled.map(({ id }) => id)).toEqual(["cancelado"]);
  });

  it("ordena próximos ascendente y los históricos descendente", () => {
    const groups = groupOrganizerEvents([
      event("proximo-lejano", "2026-10-25T20:00:00.000Z", "2026-10-25T23:00:00.000Z"),
      event("proximo-cercano", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      event("finalizado-antiguo", "2026-10-10T20:00:00.000Z", "2026-10-10T23:00:00.000Z"),
      event("finalizado-reciente", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z"),
      event("cancelado-antiguo", "2026-09-10T20:00:00.000Z", "2026-09-10T23:00:00.000Z", "CANCELADO"),
      event("cancelado-reciente", "2026-10-18T20:00:00.000Z", "2026-10-18T23:00:00.000Z", "CANCELADO"),
    ], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["proximo-cercano", "proximo-lejano"]);
    expect(groups.finished.map(({ id }) => id)).toEqual(["finalizado-reciente", "finalizado-antiguo"]);
    expect(groups.cancelled.map(({ id }) => id)).toEqual(["cancelado-reciente", "cancelado-antiguo"]);
  });

  it("usa el id como desempate estable para eventos con igual fecha", () => {
    const groups = groupOrganizerEvents([
      event("evento-b", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
      event("evento-a", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z"),
    ], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["evento-a", "evento-b"]);
  });

  it("no incluye eventos cancelados en las vistas activas o finalizadas", () => {
    const groups = groupOrganizerEvents([
      event("cancelado-futuro", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z", "CANCELADO"),
      event("cancelado-pasado", "2026-10-20T20:00:00.000Z", "2026-10-20T23:00:00.000Z", "CANCELADO"),
    ], now);

    expect(groups.upcoming).toHaveLength(0);
    expect(groups.finished).toHaveLength(0);
    expect(groups.cancelled).toHaveLength(2);
  });

  it("cuenta sólo contrataciones acordadas o completadas como bandas confirmadas", () => {
    const item = event("cupos", "2026-10-22T20:00:00.000Z", "2026-10-22T23:00:00.000Z");
    item.contrataciones = [
      { estado: "NEGOCIANDO" },
      { estado: "ACORDADO" },
      { estado: "COMPLETADO" },
      { estado: "CANCELADO" },
    ];

    expect(getConfirmedBandsCount(item)).toBe(2);
  });

  it("devuelve los tres grupos vacíos cuando no hay eventos", () => {
    expect(groupOrganizerEvents([], now)).toEqual({
      upcoming: [],
      finished: [],
      cancelled: [],
    });
  });
});
