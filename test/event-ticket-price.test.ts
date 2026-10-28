import { describe, expect, it } from "vitest";
import {
  formatTicketCta,
  formatTicketPrice,
  getTicketPriceInfo,
  ticketPriceToFormValue,
} from "@/lib/ticket-price";
import { eventCreateData, eventUpdateData } from "@/lib/event-access";
import {
  eventoCreateSchema,
  eventoEditFormSchema,
  eventoUpdateSchema,
} from "@/lib/validations/events";

const base = {
  titulo: "Festival de prueba",
  startsAt: "2030-01-01T20:00:00.000Z",
  endsAt: "2030-01-02T01:00:00.000Z",
  ubicacion: "Sala de pruebas",
  cantidadMusicosRequerida: 2,
};

describe("presentación del precio de entrada", () => {
  it("precio positivo muestra el valor en pesos y el CTA con precio", () => {
    const entradas = [{ precio: "10000", esGratuita: false }];
    expect(formatTicketPrice(entradas)).toBe(`$${(10000).toLocaleString("es-AR")}`);
    expect(formatTicketCta(entradas)).toBe(`Comprar entrada · $${(10000).toLocaleString("es-AR")}`);
    expect(getTicketPriceInfo(entradas)).toMatchObject({ status: "PAID", amount: 10000 });
  });

  it("acepta Decimal de Prisma serializable con toString", () => {
    expect(getTicketPriceInfo([{ precio: { toString: () => "2500.00" }, esGratuita: false }])).toMatchObject({
      status: "PAID",
      amount: 2500,
    });
  });

  it("entrada gratuita muestra 'Entrada gratuita'", () => {
    const entradas = [{ precio: 0, esGratuita: true }];
    expect(formatTicketPrice(entradas)).toBe("Entrada gratuita");
    expect(formatTicketCta(entradas)).toBe("Entrada gratuita");
  });

  it("evento sin Entrada mantiene el fallback 'Consultar precio'", () => {
    expect(formatTicketPrice([])).toBe("Consultar precio");
    expect(formatTicketPrice(undefined)).toBe("Consultar precio");
    expect(formatTicketCta([])).toBe("Comprar entrada");
  });

  it("precio 0 sin bandera de gratuidad no se interpreta como pago", () => {
    expect(getTicketPriceInfo([{ precio: 0, esGratuita: false }]).status).toBe("UNKNOWN");
  });

  it("varias Entrada legadas con precios distintos muestran 'Desde'", () => {
    const entradas = [
      { precio: 20000, esGratuita: false },
      { precio: 10000, esGratuita: false },
    ];
    expect(formatTicketPrice(entradas)).toBe(`Desde $${(10000).toLocaleString("es-AR")}`);
  });

  it("calcula el valor inicial del formulario de edición", () => {
    expect(ticketPriceToFormValue({ precio: "7500.00", esGratuita: false })).toBe(7500);
    expect(ticketPriceToFormValue({ precio: "0.00", esGratuita: true })).toBe(0);
    expect(ticketPriceToFormValue(undefined)).toBeNull();
  });
});

describe("validación del precio de entrada", () => {
  it("exige precioEntrada en la creación con mensaje claro", () => {
    const result = eventoCreateSchema.safeParse(base);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Ingresá el precio de entrada (0 si es gratuita)");
  });

  it("trata NaN (campo vacío) como faltante", () => {
    const result = eventoCreateSchema.safeParse({ ...base, precioEntrada: Number.NaN });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Ingresá el precio de entrada (0 si es gratuita)");
  });

  it.each([-1, 10.5, 100_000_001])("rechaza %s", (precioEntrada) => {
    expect(eventoCreateSchema.safeParse({ ...base, precioEntrada }).success).toBe(false);
  });

  it.each([0, 1, 10000, 100_000_000])("acepta %s", (precioEntrada) => {
    expect(eventoCreateSchema.safeParse({ ...base, precioEntrada }).success).toBe(true);
  });

  it("el contrato de creación sigue siendo estricto", () => {
    expect(
      eventoCreateSchema.safeParse({ ...base, precioEntrada: 1, organizadorId: crypto.randomUUID() }).success
    ).toBe(false);
  });

  it("la actualización acepta precioEntrada opcional sin exigir otros campos", () => {
    expect(eventoUpdateSchema.safeParse({}).success).toBe(true);
    expect(eventoUpdateSchema.safeParse({ precioEntrada: 0 }).success).toBe(true);
    expect(eventoUpdateSchema.safeParse({ precioEntrada: -1 }).success).toBe(false);
    expect(eventoUpdateSchema.safeParse({ estado: "CANCELADO" }).success).toBe(false);
  });

  it("el formulario de edición permite omitir el precio (evento histórico)", () => {
    expect(eventoEditFormSchema.safeParse(base).success).toBe(true);
    expect(eventoEditFormSchema.safeParse({ ...base, precioEntrada: 3 }).success).toBe(true);
  });
});

describe("datos de escritura de Entrada", () => {
  it("la creación anida una única Entrada GENERAL derivada del precio", () => {
    const data = eventCreateData("organizador-1", { ...base, precioEntrada: 0 });
    expect(data.entradas).toEqual({
      create: { tipoEntrada: "GENERAL", precio: 0, esGratuita: true },
    });
    expect(data.organizadorId).toBe("organizador-1");
  });

  it("la edición sin precio no genera escritura de Entrada", () => {
    expect(eventUpdateData({ titulo: "Nuevo" })).not.toHaveProperty("entradas");
  });
});

