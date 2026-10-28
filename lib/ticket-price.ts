/**
 * Presentación del precio de entrada de un evento.
 *
 * Arma tu pogo no vende entradas: el precio es informativo. Esta lógica pura se comparte
 * entre la cartelera, el detalle público y el formulario del organizador.
 */

export interface TicketPriceSource {
  precio: number | string | { toString(): string };
  esGratuita: boolean;
}

export type TicketPriceInfo =
  | { status: "FREE" }
  | { status: "PAID"; amount: number; isFrom: boolean }
  | { status: "UNKNOWN" };

export const FREE_TICKET_LABEL = "Entrada gratuita";
export const UNKNOWN_TICKET_LABEL = "Consultar precio";

export function formatArs(amount: number) {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function getTicketPriceInfo(entradas?: TicketPriceSource[] | null): TicketPriceInfo {
  const tickets = entradas ?? [];
  if (tickets.some((ticket) => ticket.esGratuita)) return { status: "FREE" };

  const prices = tickets
    .map((ticket) => Number(ticket.precio.toString()))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) return { status: "UNKNOWN" };
  // El modelo admite varias Entrada (legado); la UI MVP gestiona una sola GENERAL.
  return { status: "PAID", amount: prices[0], isFrom: prices.some((price) => price !== prices[0]) };
}

/** Texto del precio: "$10.000", "Entrada gratuita" o "Consultar precio". */
export function formatTicketPrice(entradas?: TicketPriceSource[] | null) {
  const info = getTicketPriceInfo(entradas);
  if (info.status === "FREE") return FREE_TICKET_LABEL;
  if (info.status === "UNKNOWN") return UNKNOWN_TICKET_LABEL;
  return `${info.isFrom ? "Desde " : ""}${formatArs(info.amount)}`;
}

/** Etiqueta del CTA (deshabilitado): "Comprar entrada · $10.000" o "Entrada gratuita". */
export function formatTicketCta(entradas?: TicketPriceSource[] | null) {
  const info = getTicketPriceInfo(entradas);
  if (info.status === "FREE") return FREE_TICKET_LABEL;
  if (info.status === "UNKNOWN") return "Comprar entrada";
  return `Comprar entrada · ${info.isFrom ? "Desde " : ""}${formatArs(info.amount)}`;
}

/**
 * Valor inicial del campo de precio al editar: `0` si es gratuita, el precio si existe
 * y `null` para eventos históricos sin Entrada.
 */
export function ticketPriceToFormValue(entrada?: TicketPriceSource | null): number | null {
  if (!entrada) return null;
  if (entrada.esGratuita) return 0;
  const price = Number(entrada.precio.toString());
  return Number.isFinite(price) ? price : null;
}

