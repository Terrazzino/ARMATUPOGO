import type { EventoInput } from "@/lib/validations/events";

export type EditableEvent = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  startsAt: string;
  endsAt: string;
  ubicacion: string;
  nombreLugar?: string | null;
  ciudad?: string | null;
  cantidadMusicosRequerida: number;
  cacheOfrecido?: number | null;
  bannerUrl?: string | null;
  estado: "PUBLICADO" | "CANCELADO";
  hasActiveContracts: boolean;
};

export const EMPTY_EVENT_FORM_VALUES: EventoInput = {
  titulo: "",
  descripcion: "",
  startsAt: "",
  endsAt: "",
  ubicacion: "",
  nombreLugar: "",
  ciudad: "",
  cantidadMusicosRequerida: 2,
  cacheOfrecido: null,
  bannerUrl: "",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function eventToFormValues(event?: EditableEvent): EventoInput {
  if (!event) return { ...EMPTY_EVENT_FORM_VALUES };
  return {
    titulo: event.titulo,
    descripcion: event.descripcion ?? "",
    startsAt: toDateTimeLocal(event.startsAt),
    endsAt: toDateTimeLocal(event.endsAt),
    ubicacion: event.ubicacion,
    nombreLugar: event.nombreLugar ?? "",
    ciudad: event.ciudad ?? "",
    cantidadMusicosRequerida: event.cantidadMusicosRequerida,
    cacheOfrecido: event.cacheOfrecido ?? null,
    bannerUrl: event.bannerUrl ?? "",
  };
}
