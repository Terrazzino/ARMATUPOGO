import Link from "next/link";

interface ProjectCardProject {
  id: string;
  nombre: string;
  genero: string;
  descripcion?: string | null;
  cacheAproximado?: number | string | { toString(): string } | null;
  ubicacion?: string | null;
  ciudad?: string | null;
  imagenUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  sitioWebUrl?: string | null;
  usuario?: {
    nombre: string;
    apellido: string;
  } | null;
}

type ProjectCardProps =
  | {
      project: ProjectCardProject;
      variant?: "public";
    }
  | {
      project: ProjectCardProject & { estaActivo: boolean };
      variant: "dashboard";
    };

export function ProjectCard(props: ProjectCardProps) {
  if (props.variant === "dashboard") {
    const { project } = props;

    return (
      <article className="atp-card group flex min-w-0 flex-col overflow-hidden">
        <div className="flex h-36 items-center justify-center border-b border-neutral-800 bg-neutral-950 p-4 sm:h-40">
          {project.imagenUrl ? (
            // Las imágenes de proyectos pueden provenir de hosts externos no configurables.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.imagenUrl}
              alt={`Imagen de ${project.nombre}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="grid h-full w-full place-items-center border border-dashed border-neutral-800 bg-neutral-900 px-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Sin imagen del proyecto
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="atp-heading truncate text-2xl" title={project.nombre}>
            {project.nombre}
          </h3>

          {project.descripcion && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
              {project.descripcion}
            </p>
          )}

          <div className="mt-4 space-y-2 border-t border-neutral-800 pt-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-neutral-500">Estado</span>
              <span className={project.estaActivo ? "font-semibold text-emerald-400" : "font-semibold text-neutral-500"}>
                {project.estaActivo ? "● Activo" : "○ Inactivo"}
              </span>
            </div>

            {project.cacheAproximado && Number(project.cacheAproximado.toString()) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-neutral-500">Caché orientativo</span>
                <span className="font-semibold text-neutral-200">
                  ${Number(project.cacheAproximado.toString()).toLocaleString("es-AR")}
                </span>
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-neutral-800 pt-4">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex min-h-10 items-center font-bold text-red-400 underline-offset-4 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Ver perfil público →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const { project } = props;

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden flex flex-col hover:border-neutral-700 transition-colors">
      {/* Header with avatar / banner */}
      <div className="bg-neutral-900 text-white p-5 flex items-center gap-4 border-b border-red-600">
        <div className="w-14 h-14 rounded-full bg-red-700 border-2 border-white/20 flex items-center justify-center text-2xl font-bold uppercase shrink-0">
          {project.nombre.charAt(0)}
        </div>
        <div className="overflow-hidden">
          <span className="text-xs font-semibold px-2 py-0.5 bg-white/20 rounded-md uppercase tracking-wider">
            {project.genero}
          </span>
          <h3 className="text-lg font-bold truncate mt-1">{project.nombre}</h3>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {project.ciudad && (
            <p className="text-xs text-neutral-400 flex items-center gap-1">
              <span>📍</span> {project.ciudad}{project.ubicacion ? ` - ${project.ubicacion}` : ""}
            </p>
          )}

          {project.descripcion && (
            <p className="text-sm text-neutral-300 line-clamp-2">
              {project.descripcion}
            </p>
          )}

          {project.cacheAproximado && Number(project.cacheAproximado.toString()) > 0 && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Caché orientativo: ${Number(project.cacheAproximado.toString()).toLocaleString("es-AR")}
            </p>
          )}
        </div>

        {/* External links */}
        <div className="flex items-center gap-3 text-sm text-neutral-400 pt-2 border-t border-neutral-800">
          {project.spotifyUrl && (
            <a
              href={project.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-medium text-xs flex items-center gap-1"
            >
              <span>🟢 Spotify</span>
            </a>
          )}
          {project.youtubeUrl && (
            <a
              href={project.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 font-medium text-xs flex items-center gap-1"
            >
              <span>🔴 YouTube</span>
            </a>
          )}
          {project.instagramUrl && (
            <a
              href={project.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-red-400 font-medium text-xs flex items-center gap-1"
            >
              <span>📷 Instagram</span>
            </a>
          )}
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="w-full text-center py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Ver Perfil Artístico
        </Link>
      </div>
    </div>
  );
}
