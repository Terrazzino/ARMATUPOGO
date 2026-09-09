import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface EventCardProps {
  event: {
    id: string;
    titulo: string;
    descripcion?: string | null;
    startsAt: Date | string;
    endsAt?: Date | string | null;
    ubicacion: string;
    nombreLugar?: string | null;
    ciudad?: string | null;
    cantidadMusicosRequerida: number;
    cacheOfrecido?: number | string | { toString(): string } | null;
    estado: string;
    bannerUrl?: string | null;
    organizador?: {
      nombre: string;
      apellido: string;
    } | null;
    contrataciones?: Array<{
      id: string;
      proyectoMusical: {
        id: string;
        nombre: string;
        genero: string;
        imagenUrl?: string | null;
      };
    }>;
  };
}

export function EventCard({ event }: EventCardProps) {
  const dateObj = new Date(event.startsAt);
  const formattedDate = dateObj.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const confirmedCount = event.contrataciones?.length || 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Event Header / Banner placeholder if no image */}
      <div className="bg-red-700 text-white p-5 flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-red-100 block mb-1">
            {formattedDate} • {formattedTime} hs
          </span>
          <h3 className="text-xl font-bold line-clamp-1">{event.titulo}</h3>
        </div>
        <StatusBadge status={event.estado} />
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
            <span>📍</span>
            <span>{event.nombreLugar ? `${event.nombreLugar}, ` : ""}{event.ubicacion}{event.ciudad ? ` (${event.ciudad})` : ""}</span>
          </div>

          {event.descripcion && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {event.descripcion}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-gray-800 dark:text-gray-200 font-bold">{confirmedCount}</span> de {event.cantidadMusicosRequerida} bandas confirmadas
            </div>
            {event.cacheOfrecido && Number(event.cacheOfrecido.toString()) > 0 && (
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Caché: ${Number(event.cacheOfrecido.toString()).toLocaleString("es-AR")}
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/events/${event.id}`}
          className="w-full text-center py-2.5 px-4 bg-neutral-900 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Ver Detalles y Postularse
        </Link>
      </div>
    </div>
  );
}