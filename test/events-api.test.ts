import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  txEventUpdate: vi.fn(),
  txPostulationUpdateMany: vi.fn(),
  txContractUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evento: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { AuthenticationError } from "@/lib/errors";
import type { RolUsuario, Usuario } from "@/lib/types";
import { GET as listEvents, POST as createEvent } from "@/app/api/eventos/route";
import {
  GET as getPrivateEvent,
  PATCH as patchEvent,
} from "@/app/api/eventos/[eventoId]/route";
import { POST as cancelEvent } from "@/app/api/eventos/[eventoId]/cancelar/route";
import { GET as listPublicEvents } from "@/app/api/publico/eventos/route";
import { GET as getPublicEvent } from "@/app/api/publico/eventos/[eventoId]/route";

function user(role: RolUsuario = "ORGANIZADOR"): Usuario {
  return {
    id: crypto.randomUUID(),
    email: "persona@example.com",
    nombre: "Nombre",
    apellido: "Apellido",
    rol: role,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

function event(organizerId = crypto.randomUUID(), state: "PUBLICADO" | "CANCELADO" = "PUBLICADO") {
  return {
    id: crypto.randomUUID(),
    organizadorId: organizerId,
    titulo: "Festival de pruebas",
    descripcion: null,
    startsAt: new Date(Date.now() + 86_400_000),
    endsAt: new Date(Date.now() + 90_000_000),
    ubicacion: "Sala de pruebas",
    nombreLugar: null,
    ciudad: null,
    cantidadMusicosRequerida: 2,
    cacheOfrecido: null,
    estado: state,
    bannerUrl: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    contrataciones: [],
  };
}

function validBody() {
  return {
    titulo: "Festival de pruebas",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    endsAt: new Date(Date.now() + 90_000_000).toISOString(),
    ubicacion: "Sala de pruebas",
    cantidadMusicosRequerida: 2,
  };
}

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function params(eventoId: string) {
  return { params: Promise.resolve({ eventoId }) };
}

describe("API privada de eventos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        evento: { update: mocks.txEventUpdate },
        postulacion: { updateMany: mocks.txPostulationUpdateMany },
        contratacion: { updateMany: mocks.txContractUpdateMany },
      })
    );
  });

  it("POST sin sesión devuelve 401", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthenticationError());

    const response = await createEvent(
      request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody()),
      })
    );

    expect(response.status).toBe(401);
  });

  it("un MUSICO no puede crear eventos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));

    const response = await createEvent(
      request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody()),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("un ORGANIZADOR crea un evento con identidad derivada de la sesión", async () => {
    const organizer = user();
    const created = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.create.mockResolvedValue(created);

    const response = await createEvent(
      request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody()),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizadorId: organizer.id,
        estado: "PUBLICADO",
      }),
    });
  });

  it("rechaza organizadorId enviado por el cliente", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const response = await createEvent(
      request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validBody(), organizadorId: crypto.randomUUID() }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("un ORGANIZADOR lista solamente sus eventos", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findMany.mockResolvedValue([event(organizer.id)]);

    const response = await listEvents(request("http://localhost/api/eventos"));

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizadorId: organizer.id } })
    );
  });

  it("un ORGANIZADOR consulta su evento, incluso cancelado", async () => {
    const organizer = user();
    const owned = event(organizer.id, "CANCELADO");
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);

    const response = await getPrivateEvent(
      request(`http://localhost/api/eventos/${owned.id}`),
      params(owned.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: owned.id, organizadorId: organizer.id },
      })
    );
  });

  it.each(["ajeno", "inexistente"])("detalle privado %s devuelve 404", async () => {
    const organizer = user();
    const eventId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(null);

    const response = await getPrivateEvent(
      request(`http://localhost/api/eventos/${eventId}`),
      params(eventId)
    );

    expect(response.status).toBe(404);
  });

  it("un MUSICO no puede consultar el detalle privado", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));
    const eventId = crypto.randomUUID();

    const response = await getPrivateEvent(
      request(`http://localhost/api/eventos/${eventId}`),
      params(eventId)
    );

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("un ORGANIZADOR modifica su evento", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, titulo: "Festival actualizado" });

    const response = await patchEvent(
      request(`http://localhost/api/eventos/${owned.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: "Festival actualizado" }),
      }),
      params(owned.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, organizadorId: organizer.id } })
    );
  });

  it("un evento ajeno devuelve 404 al modificar", async () => {
    const organizer = user();
    const eventId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(null);

    const response = await patchEvent(
      request(`http://localhost/api/eventos/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: "Festival actualizado" }),
      }),
      params(eventId)
    );

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("un MUSICO no puede modificar eventos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));
    const eventId = crypto.randomUUID();

    const response = await patchEvent(
      request(`http://localhost/api/eventos/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: "Festival actualizado" }),
      }),
      params(eventId)
    );

    expect(response.status).toBe(403);
  });

  it("PATCH no permite cancelar directamente", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);

    const response = await patchEvent(
      request(`http://localhost/api/eventos/${owned.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADO" }),
      }),
      params(owned.id)
    );

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("el propietario cancela mediante la transacción oficial", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.txEventUpdate.mockResolvedValue({ ...owned, estado: "CANCELADO" });

    const response = await cancelEvent(
      request(`http://localhost/api/eventos/${owned.id}/cancelar`, { method: "POST" }),
      params(owned.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.txEventUpdate).toHaveBeenCalledWith({
      where: { id: owned.id, organizadorId: organizer.id },
      data: { estado: "CANCELADO" },
    });
    expect(mocks.txPostulationUpdateMany).toHaveBeenCalledOnce();
    expect(mocks.txContractUpdateMany).toHaveBeenCalledOnce();
  });

  it("cancelar un evento ajeno devuelve 404", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());
    mocks.findFirst.mockResolvedValue(null);
    const eventId = crypto.randomUUID();

    const response = await cancelEvent(
      request(`http://localhost/api/eventos/${eventId}/cancelar`, { method: "POST" }),
      params(eventId)
    );

    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("un MUSICO no puede cancelar eventos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));
    const eventId = crypto.randomUUID();

    const response = await cancelEvent(
      request(`http://localhost/api/eventos/${eventId}/cancelar`, { method: "POST" }),
      params(eventId)
    );

    expect(response.status).toBe(403);
  });
});

describe("API pública de eventos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista eventos sin sesión y filtra publicados no finalizados", async () => {
    mocks.findMany.mockResolvedValue([]);

    const response = await listPublicEvents(
      request("http://localhost/api/publico/eventos")
    );

    expect(response.status).toBe(200);
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      estado: "PUBLICADO",
      endsAt: { gt: expect.any(Date) },
    });
  });

  it("devuelve un evento PUBLICADO", async () => {
    const published = event();
    mocks.findFirst.mockResolvedValue(published);

    const response = await getPublicEvent(
      request(`http://localhost/api/publico/eventos/${published.id}`),
      params(published.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: published.id, estado: "PUBLICADO" } })
    );
  });

  it.each(["cancelado/no público", "inexistente"])(
    "devuelve 404 para evento %s",
    async () => {
      const eventId = crypto.randomUUID();
      mocks.findFirst.mockResolvedValue(null);

      const response = await getPublicEvent(
        request(`http://localhost/api/publico/eventos/${eventId}`),
        params(eventId)
      );

      expect(response.status).toBe(404);
    }
  );
});
