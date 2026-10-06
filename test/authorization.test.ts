import { describe, expect, it } from "vitest";
import {
  offerForCounterpartyWhere,
  ownedEventWhere,
  ownedProjectWhere,
  participatingContractWhere,
} from "@/lib/authorization";

describe("filtros de pertenencia", () => {
  it("filtra proyectos y eventos por propietario en la consulta", () => {
    const userId = crypto.randomUUID();

    expect(ownedProjectWhere(crypto.randomUUID(), userId)).toMatchObject({
      usuarioId: userId,
    });
    expect(ownedEventWhere(crypto.randomUUID(), userId)).toMatchObject({
      organizadorId: userId,
    });
  });

  it("limita contratos a sus participantes", () => {
    const userId = crypto.randomUUID();

    expect(participatingContractWhere(crypto.randomUUID(), userId)).toMatchObject({
      OR: [{ organizadorId: userId }, { musicoId: userId }],
    });
  });

  it("limita una oferta a la contraparte participante", () => {
    const userId = crypto.randomUUID();

    expect(offerForCounterpartyWhere(crypto.randomUUID(), userId)).toMatchObject({
      remitenteId: { not: userId },
      contratacion: {
        OR: [{ organizadorId: userId }, { musicoId: userId }],
      },
    });
  });
});
