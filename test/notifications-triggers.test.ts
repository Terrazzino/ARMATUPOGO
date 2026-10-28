import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  // Postulacion
  postulacionFindFirst: vi.fn(),
  postulacionFindUnique: vi.fn(),
  postulacionFindUniqueOrThrow: vi.fn(),
  postulacionCreate: vi.fn(),
  postulacionUpdateMany: vi.fn(),
  // Proyecto
  proyectoMusicalFindFirst: vi.fn(),
  proyectoMusicalFindUnique: vi.fn(),
  // Evento
  eventoFindFirst: vi.fn(),
  eventoFindUnique: vi.fn(),
  eventoUpdate: vi.fn(),
  // Contratacion
  contratacionFindFirst: vi.fn(),
  contratacionFindMany: vi.fn(),
  contratacionFindUnique: vi.fn(),
  contratacionFindUniqueOrThrow: vi.fn(),
  contratacionCreate: vi.fn(),
  contratacionUpdate: vi.fn(),
  contratacionUpdateMany: vi.fn(),
  // Oferta
  ofertaFindFirst: vi.fn(),
  ofertaCreate: vi.fn(),
  ofertaUpdateMany: vi.fn(),
  ofertaFindUniqueOrThrow: vi.fn(),
  // Notificacion
  notificacionCreate: vi.fn(),
  notificacionCreateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    postulacion: {
      findFirst: mocks.postulacionFindFirst,
      findUnique: mocks.postulacionFindUnique,
      findUniqueOrThrow: mocks.postulacionFindUniqueOrThrow,
      create: mocks.postulacionCreate,
      updateMany: mocks.postulacionUpdateMany,
    },
    proyectoMusical: {
      findFirst: mocks.proyectoMusicalFindFirst,
      findUnique: mocks.proyectoMusicalFindUnique,
    },
    evento: {
      findFirst: mocks.eventoFindFirst,
      findUnique: mocks.eventoFindUnique,
      update: mocks.eventoUpdate,
    },
    contratacion: {
      findFirst: mocks.contratacionFindFirst,
      findMany: mocks.contratacionFindMany,
      findUnique: mocks.contratacionFindUnique,
      findUniqueOrThrow: mocks.contratacionFindUniqueOrThrow,
      create: mocks.contratacionCreate,
      update: mocks.contratacionUpdate,
      updateMany: mocks.contratacionUpdateMany,
    },
    oferta: {
      findFirst: mocks.ofertaFindFirst,
      create: mocks.ofertaCreate,
      updateMany: mocks.ofertaUpdateMany,
      findUniqueOrThrow: mocks.ofertaFindUniqueOrThrow,
    },
    notificacion: {
      create: mocks.notificacionCreate,
      createMany: mocks.notificacionCreateMany,
    },
  },
}));

import {
  createPostulationForMusician,
  acceptOwnedPostulation,
  rejectOwnedPostulation,
} from "@/lib/postulation-access";
import {
  createDirectContract,
  cancelParticipatingContract,
} from "@/lib/contract-access";
import {
  createOfferForParticipant,
  acceptOfferAsCounterparty,
} from "@/lib/offer-access";
import { cancelOwnedEvent } from "@/lib/event-access";

describe("Triggers de notificaciones automáticas", () => {
  const musicianId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const musicoId = musicianId;
  const organizerId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const organizadorId = organizerId;
  const projectId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const eventId = "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
  const eventoId = eventId;
  const postulationId = "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";
  const contractId = "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66";
  const offerId = "a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77";

  const txMock = {
    postulacion: {
      create: mocks.postulacionCreate,
      findUnique: mocks.postulacionFindUnique,
      findUniqueOrThrow: mocks.postulacionFindUniqueOrThrow,
      updateMany: mocks.postulacionUpdateMany,
    },
    contratacion: {
      create: mocks.contratacionCreate,
      findUnique: mocks.contratacionFindUnique,
      findFirst: mocks.contratacionFindFirst,
      findMany: mocks.contratacionFindMany,
      findUniqueOrThrow: mocks.contratacionFindUniqueOrThrow,
      update: mocks.contratacionUpdate,
      updateMany: mocks.contratacionUpdateMany,
    },
    evento: {
      findFirst: mocks.eventoFindFirst,
      update: mocks.eventoUpdate,
    },
    proyectoMusical: {
      findUnique: mocks.proyectoMusicalFindUnique,
    },
    oferta: {
      create: mocks.ofertaCreate,
      findFirst: mocks.ofertaFindFirst,
      updateMany: mocks.ofertaUpdateMany,
      findUniqueOrThrow: mocks.ofertaFindUniqueOrThrow,
    },
    notificacion: {
      create: mocks.notificacionCreate,
      createMany: mocks.notificacionCreateMany,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) => {
      if (typeof cb === "function") {
        return cb(txMock);
      }
      return cb;
    });
  });

  describe("1. createPostulationForMusician -> POSTULACION_RECIBIDA", () => {
    it("notifica al organizador del evento y enlaza a /dashboard/organizer", async () => {
      mocks.proyectoMusicalFindFirst.mockResolvedValueOnce({
        id: projectId,
        nombre: "Los Pibes del Pogo",
        estaActivo: true,
        usuarioId: musicianId,
      });
      mocks.eventoFindUnique.mockResolvedValueOnce({
        id: eventId,
        titulo: "Festival Rock",
        organizadorId,
        estado: "PUBLICADO",
        startsAt: new Date(Date.now() + 86400000),
      });
      mocks.postulacionFindUnique.mockResolvedValueOnce(null);
      mocks.postulacionCreate.mockResolvedValueOnce({
        id: postulationId,
        eventoId,
        proyectoMusicalId: projectId,
        musicoId: musicianId,
      });

      await createPostulationForMusician({
        eventId,
        projectId,
        musicianId,
        initialMessage: "Queremos tocar!",
      });

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: organizerId,
          tipo: "POSTULACION_RECIBIDA",
          titulo: "Nueva postulación recibida",
          mensaje: 'El proyecto "Los Pibes del Pogo" se postuló a tu evento "Festival Rock".',
          enlace: "/dashboard/organizer",
        },
      });
    });
  });

  describe("2. acceptOwnedPostulation -> POSTULACION_ACEPTADA", () => {
    it("notifica al músico postulante y enlaza a /dashboard/musician", async () => {
      mocks.postulacionFindFirst.mockResolvedValueOnce({
        id: postulationId,
        eventoId,
        proyectoMusicalId: projectId,
        musicoId: musicianId,
        estado: "PENDIENTE",
        evento: {
          id: eventId,
          titulo: "Festival Rock",
          estado: "PUBLICADO",
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 90000000),
        },
        proyectoMusical: {
          id: projectId,
          nombre: "Los Pibes del Pogo",
        },
      });
      mocks.contratacionFindUnique.mockResolvedValueOnce(null);
      mocks.postulacionUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.contratacionFindFirst.mockResolvedValueOnce(null);
      mocks.contratacionCreate.mockResolvedValueOnce({ id: contractId });
      mocks.postulacionFindUniqueOrThrow.mockResolvedValueOnce({ id: postulationId });

      await acceptOwnedPostulation(postulationId, organizerId);

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: musicianId,
          tipo: "POSTULACION_ACEPTADA",
          titulo: "Postulación aceptada",
          mensaje: 'Tu postulación con "Los Pibes del Pogo" para el evento "Festival Rock" fue aceptada.',
          enlace: "/dashboard/musician",
        },
      });
    });
  });

  describe("3. rejectOwnedPostulation -> POSTULACION_RECHAZADA", () => {
    it("notifica al músico postulante y enlaza a /dashboard/musician", async () => {
      mocks.postulacionFindFirst.mockResolvedValueOnce({
        id: postulationId,
        eventoId,
        proyectoMusicalId: projectId,
        musicoId: musicianId,
        estado: "PENDIENTE",
        evento: { titulo: "Festival Rock" },
        proyectoMusical: { nombre: "Los Pibes del Pogo" },
      });
      mocks.postulacionUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.postulacionFindUniqueOrThrow.mockResolvedValueOnce({ id: postulationId });

      await rejectOwnedPostulation(postulationId, organizerId);

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: musicianId,
          tipo: "POSTULACION_RECHAZADA",
          titulo: "Postulación no aceptada",
          mensaje: 'Tu postulación con "Los Pibes del Pogo" para el evento "Festival Rock" fue rechazada.',
          enlace: "/dashboard/musician",
        },
      });
    });
  });

  describe("4. createDirectContract -> INVITACION_RECIBIDA", () => {
    it("notifica al músico dueño del proyecto y enlaza a /dashboard/musician", async () => {
      txMock.evento.findFirst.mockResolvedValueOnce({
        id: eventId,
        titulo: "Festival Rock",
        estado: "PUBLICADO",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        cantidadMusicosRequerida: 3,
        contrataciones: [],
      });
      txMock.proyectoMusical.findUnique.mockResolvedValueOnce({
        id: projectId,
        nombre: "Los Pibes del Pogo",
        estaActivo: true,
        usuarioId: musicianId,
      });
      txMock.postulacion.findUnique.mockResolvedValueOnce(null);
      txMock.contratacion.findUnique.mockResolvedValueOnce(null);
      txMock.contratacion.findMany.mockResolvedValueOnce([]);
      txMock.contratacion.create.mockResolvedValueOnce({ id: contractId });

      await createDirectContract({
        eventId,
        projectId,
        organizerId,
      });

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: musicianId,
          tipo: "INVITACION_RECIBIDA",
          titulo: "Nueva invitación recibida",
          mensaje: 'Recibiste una invitación para participar con "Los Pibes del Pogo" en el evento "Festival Rock".',
          enlace: "/dashboard/musician",
        },
      });
    });
  });

  describe("5. cancelParticipatingContract -> CONTRATACION_CANCELADA", () => {
    it("notifica al músico cuando cancela el organizador", async () => {
      mocks.contratacionFindFirst.mockResolvedValueOnce({
        id: contractId,
        organizadorId,
        musicoId: musicianId,
        estado: "NEGOCIANDO",
        evento: {
          titulo: "Festival Rock",
          startsAt: new Date(Date.now() + 86400000),
        },
      });
      mocks.contratacionUpdate.mockResolvedValueOnce({ id: contractId, estado: "CANCELADO" });

      await cancelParticipatingContract({
        contractId,
        userId: organizerId,
        cancellationReason: "Problemas técnicos",
      });

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: musicianId,
          tipo: "CONTRATACION_CANCELADA",
          titulo: "Contratación cancelada",
          mensaje: 'La contratación para el evento "Festival Rock" fue cancelada.',
          enlace: "/dashboard/musician",
        },
      });
    });

    it("notifica al organizador cuando cancela el músico", async () => {
      mocks.contratacionFindFirst.mockResolvedValueOnce({
        id: contractId,
        organizadorId,
        musicoId: musicianId,
        estado: "NEGOCIANDO",
        evento: {
          titulo: "Festival Rock",
          startsAt: new Date(Date.now() + 86400000),
        },
      });
      mocks.contratacionUpdate.mockResolvedValueOnce({ id: contractId, estado: "CANCELADO" });

      await cancelParticipatingContract({
        contractId,
        userId: musicianId,
      });

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: organizerId,
          tipo: "CONTRATACION_CANCELADA",
          titulo: "Contratación cancelada",
          mensaje: 'La contratación para el evento "Festival Rock" fue cancelada.',
          enlace: "/dashboard/organizer",
        },
      });
    });
  });

  describe("6. createOfferForParticipant -> OFERTA_RECIBIDA", () => {
    it("notifica al organizador cuando el músico envía oferta", async () => {
      mocks.contratacionFindFirst.mockResolvedValueOnce({
        id: contractId,
        organizadorId,
        musicoId: musicianId,
        estado: "NEGOCIANDO",
        evento: { titulo: "Festival Rock" },
        ofertas: [],
      });
      mocks.ofertaCreate.mockResolvedValueOnce({ id: offerId });

      await createOfferForParticipant({
        contractId,
        userId: musicianId,
        amount: 50000,
        message: "Nuestra propuesta",
      });

      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: organizerId,
          tipo: "OFERTA_RECIBIDA",
          titulo: "Nueva oferta recibida",
          mensaje: expect.stringContaining("Festival Rock"),
          enlace: "/dashboard/organizer",
        },
      });
    });
  });

  describe("7. acceptOfferAsCounterparty -> OFERTA_ACEPTADA", () => {
    it("notifica al remitente de la oferta y no duplica si hay retry Serializable P2034", async () => {
      let attempts = 0;
      mocks.transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) => {
        attempts++;
        if (attempts === 1) {
          const p2034 = new Prisma.PrismaClientKnownRequestError("Conflict", {
            code: "P2034",
            clientVersion: "mock",
          });
          throw p2034;
        }
        return cb(txMock);
      });

      txMock.oferta.findFirst.mockResolvedValueOnce({
        id: offerId,
        remitenteId: musicianId,
        monto: 50000,
        estado: "PROPUESTA",
        contratacion: {
          id: contractId,
          organizadorId,
          musicoId,
          estado: "NEGOCIANDO",
          evento: {
            titulo: "Festival Rock",
            startsAt: new Date(Date.now() + 86400000),
            endsAt: new Date(Date.now() + 90000000),
            cantidadMusicosRequerida: 2,
            contrataciones: [],
          },
          ofertas: [],
        },
      });
      txMock.contratacion.findMany.mockResolvedValueOnce([]);
      txMock.contratacion.updateMany.mockResolvedValueOnce({ count: 1 });
      txMock.oferta.updateMany.mockResolvedValueOnce({ count: 1 });
      txMock.oferta.findUniqueOrThrow.mockResolvedValueOnce({ id: offerId });
      txMock.contratacion.findUniqueOrThrow.mockResolvedValueOnce({ id: contractId });

      await acceptOfferAsCounterparty(offerId, organizerId);

      expect(attempts).toBe(2);
      expect(mocks.notificacionCreate).toHaveBeenCalledTimes(1);
      expect(mocks.notificacionCreate).toHaveBeenCalledWith({
        data: {
          usuarioId: musicianId,
          tipo: "OFERTA_ACEPTADA",
          titulo: "Oferta aceptada",
          mensaje: expect.stringContaining("Festival Rock"),
          enlace: "/dashboard/musician",
        },
      });
    });
  });

  describe("8. cancelOwnedEvent -> EVENTO_CANCELADO", () => {
    it("notifica a todos los músicos afectados sin duplicados", async () => {
      mocks.eventoFindFirst.mockResolvedValueOnce({
        id: eventId,
        titulo: "Festival Rock",
        organizadorId,
        estado: "PUBLICADO",
        startsAt: new Date(Date.now() + 86400000),
      });

      txMock.contratacion.findMany.mockResolvedValueOnce([
        { musicoId: "musician-1" },
        { musicoId: "musician-1" },
        { musicoId: "musician-2" },
      ]);
      txMock.evento.update.mockResolvedValueOnce({ id: eventId, estado: "CANCELADO" });

      await cancelOwnedEvent(eventId, organizerId);

      expect(mocks.notificacionCreateMany).toHaveBeenCalledWith({
        data: [
          {
            usuarioId: "musician-1",
            tipo: "EVENTO_CANCELADO",
            titulo: "Evento cancelado",
            mensaje: 'El evento "Festival Rock" fue cancelado por el organizador.',
            enlace: "/dashboard/musician",
          },
          {
            usuarioId: "musician-2",
            tipo: "EVENTO_CANCELADO",
            titulo: "Evento cancelado",
            mensaje: 'El evento "Festival Rock" fue cancelado por el organizador.',
            enlace: "/dashboard/musician",
          },
        ],
      });
    });

    it("no crea notificaciones si no había contrataciones activas", async () => {
      mocks.eventoFindFirst.mockResolvedValueOnce({
        id: eventId,
        titulo: "Festival Rock",
        organizadorId,
        estado: "PUBLICADO",
        startsAt: new Date(Date.now() + 86400000),
      });

      txMock.contratacion.findMany.mockResolvedValueOnce([]);
      txMock.evento.update.mockResolvedValueOnce({ id: eventId, estado: "CANCELADO" });

      await cancelOwnedEvent(eventId, organizerId);

      expect(mocks.notificacionCreateMany).not.toHaveBeenCalled();
    });
  });
});
