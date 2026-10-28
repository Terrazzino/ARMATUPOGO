import Link from "next/link";
import { EventLineupModal, type LineupProject } from "@/components/events/EventLineupModal";
import {
  formatTicketCta,
  formatTicketPrice,
  getTicketPriceInfo,
  type TicketPriceSource,
} from "@/lib/ticket-price";

interface EventCardProps {
  event: {
    id: string;
    titulo: string;
    startsAt: Date | string;
    ubicacion: string;
    nombreLugar?: string | null;
    ciudad?: string | null;
    bannerUrl?: string | null;
    entradas?: TicketPriceSource[];
    contrataciones?: Array<{
      proyectoMusical: {
        id: string;
        nombre: string;
        genero: string;
        spotifyUrl?: string | null;
        youtubeUrl?: string | null;
        instagramUrl?: string | null;
        sitioWebUrl?: string | null;
        enlacesPersonalizados?: unknown;
      };
    }>;
  };
  prioritizeImage?: boolean;
}

function getCustomLinks(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { title?: unknown; label?: unknown; url?: unknown };
    if (typeof candidate.url !== "string" || !isSafeExternalUrl(candidate.url)) return [];

    const label =
      typeof candidate.title === "string"
        ? candidate.title
        : typeof candidate.label === "string"
          ? candidate.label
          : "Otro link";
    return [{ label, url: candidate.url }];
  });
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function externalLink(label: string, value?: string | null) {
  return value && isSafeExternalUrl(value) ? { label, url: value } : null;
}

function getLineup(event: EventCardProps["event"]): LineupProject[] {
  return (event.contrataciones ?? []).map(({ proyectoMusical }) => ({
    id: proyectoMusical.id,
    nombre: proyectoMusical.nombre,
    genero: proyectoMusical.genero,
    links: [
      externalLink("Instagram", proyectoMusical.instagramUrl),
      externalLink("Spotify", proyectoMusical.spotifyUrl),
      externalLink("YouTube", proyectoMusical.youtubeUrl),
      externalLink("Sitio web", proyectoMusical.sitioWebUrl),
      ...getCustomLinks(proyectoMusical.enlacesPersonalizados),
    ].filter((link): link is { label: string; url: string } => link !== null),
  }));
}

export function EventCard({ event, prioritizeImage = false }: EventCardProps) {
  const date = new Date(event.startsAt);
  const day = date.toLocaleDateString("es-AR", { day: "2-digit" });
  const month = date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  const fullDate = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const lineup = getLineup(event);
  const priceInfo = getTicketPriceInfo(event.entradas);

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-neutral-800 bg-neutral-950 transition-colors hover:border-neutral-600">
      <Link
        href={`/events/${event.id}`}
        aria-label={`Ver detalles de ${event.titulo}`}
        className="relative block aspect-[4/5] overflow-hidden bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
      >
        {event.bannerUrl ? (
          // Las URLs de flyers son externas y no tienen un host único configurable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.bannerUrl}
            alt={`Flyer de ${event.titulo}`}
            loading={prioritizeImage ? "eager" : "lazy"}
            fetchPriority={prioritizeImage ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="event-flyer-placeholder h-full w-full" aria-hidden="true">
            <span>FLYER NO DISPONIBLE</span>
          </div>
        )}
        <div className="absolute left-0 top-0 min-w-14 bg-red-600 px-2.5 py-2 text-center text-white shadow-lg">
          <span className="block text-xl font-black leading-none">{day}</span>
          <span className="block text-[0.7rem] font-black uppercase tracking-[0.18em]">{month}</span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-400">
          {fullDate} · {time} hs
        </p>
        <h3 className="event-card-title mt-1 text-xl font-black leading-tight text-white">
          <Link href={`/events/${event.id}`} className="hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            {event.titulo}
          </Link>
        </h3>

        <dl className="mt-3 space-y-2 border-t border-neutral-800 pt-2.5 text-sm">
          {/* Con precio o gratuita, el valor ya se comunica en el botón; sólo se conserva el fallback. */}
          {priceInfo.status === "UNKNOWN" && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Entrada</dt>
              <dd className="mt-0.5 font-black text-white">{formatTicketPrice(event.entradas)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Lugar</dt>
            <dd className="mt-0.5 font-bold text-neutral-200">{event.nombreLugar || "Lugar a confirmar"}</dd>
            <dd className="text-neutral-400">{event.ubicacion}{event.ciudad ? ` · ${event.ciudad}` : ""}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row">
          <EventLineupModal eventTitle={event.titulo} projects={lineup} />
          <button
            type="button"
            disabled
            aria-describedby={`ticket-note-${event.id}`}
            className="min-h-11 flex-1 cursor-not-allowed bg-red-600 px-2 py-2 text-xs font-black text-white opacity-65 sm:min-h-10"
          >
            {formatTicketCta(event.entradas)}
          </button>
        </div>
        <p id={`ticket-note-${event.id}`} className="sr-only">
          {priceInfo.status === "FREE"
            ? "Entrada gratuita. No requiere compra."
            : "La compra de entradas todavía no está disponible en la plataforma."}
        </p>
      </div>
    </article>
  );
}
