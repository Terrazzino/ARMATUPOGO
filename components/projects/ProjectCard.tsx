import Link from "next/link";
import { DeferredEditProjectModal } from "@/components/projects/DeferredEditProjectModal";

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
  enlacesPersonalizados?: unknown;
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
    const cacheAmount = project.cacheAproximado == null
      ? null
      : Number(project.cacheAproximado.toString());
    const hasCache = cacheAmount !== null && Number.isFinite(cacheAmount) && cacheAmount > 0;

    return (
      <article className="atp-card group grid w-full max-w-[27.5rem] min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] place-self-start overflow-hidden sm:grid-cols-[8.5rem_minmax(0,1fr)] lg:grid-cols-[10.5rem_minmax(0,1fr)]">
        <div className="aspect-square w-full self-start border-r border-neutral-800 bg-neutral-950">
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
            <div className="grid h-full w-full place-items-center bg-neutral-900 px-2 text-center">
              <span className="text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-neutral-600 sm:text-xs sm:tracking-[0.14em]">
                Sin imagen del proyecto
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-3">
          <h3 className="atp-heading truncate text-[1.35rem] sm:text-[1.5rem]" title={project.nombre}>
            {project.nombre}
          </h3>

          <p className="mt-1 line-clamp-1 text-sm leading-snug text-neutral-400">
            {project.descripcion || project.genero}
          </p>

          <dl className="mt-2 space-y-1 border-t border-neutral-800 pt-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-neutral-500">Estado</dt>
              <dd className={project.estaActivo ? "shrink-0 font-semibold text-emerald-400" : "shrink-0 font-semibold text-neutral-500"}>
                {project.estaActivo ? "● Activo" : "○ Inactivo"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-neutral-500">Caché orientativo</dt>
              <dd className="shrink-0 font-semibold text-neutral-200">
                {hasCache
                  ? `$${cacheAmount.toLocaleString("es-AR")}`
                  : "Sin definir"}
              </dd>
            </div>
          </dl>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-neutral-800 pt-2 [&_.atp-button]:min-h-9 [&_.atp-button]:px-3 [&_.atp-button]:text-xs">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex min-h-9 items-center text-xs font-bold text-red-400 underline-offset-4 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:text-sm"
            >
              Ver perfil público →
            </Link>
            <DeferredEditProjectModal
              project={{
                id: project.id,
                nombre: project.nombre,
                genero: project.genero,
                descripcion: project.descripcion ?? "",
                cacheAproximado: project.cacheAproximado ? Number(project.cacheAproximado.toString()) : null,
                ciudad: project.ciudad ?? "",
                imagenUrl: project.imagenUrl ?? "",
                spotifyUrl: project.spotifyUrl ?? "",
                youtubeUrl: project.youtubeUrl ?? "",
                instagramUrl: project.instagramUrl ?? "",
                sitioWebUrl: project.sitioWebUrl ?? "",
                enlacesPersonalizados: Array.isArray(project.enlacesPersonalizados)
                  ? project.enlacesPersonalizados.filter(
                      (link): link is { title: string; url: string } =>
                        Boolean(link) && typeof link === "object" && "title" in link && "url" in link &&
                        typeof link.title === "string" && typeof link.url === "string"
                    )
                  : [],
              }}
            />
          </div>
        </div>
      </article>
    );
  }

  const { project } = props;
  const genre = project.genero.trim() || "Género no especificado";
  const city = project.ciudad?.trim() || "Ciudad no especificada";
  const description = project.descripcion?.trim() || "Sin descripción";
  const cacheAmount = project.cacheAproximado == null
    ? null
    : Number(project.cacheAproximado.toString());
  const hasCache = cacheAmount !== null && Number.isFinite(cacheAmount) && cacheAmount > 0;

  return (
    <article className="atp-card grid h-full min-h-[12.5rem] min-w-0 grid-cols-[38%_minmax(0,1fr)] overflow-hidden">
      <div className="h-full border-r border-neutral-800 bg-neutral-950">
        <div className="aspect-square w-full">
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
            <div className="grid h-full w-full place-items-center bg-neutral-900 px-2 text-center">
              <span className="text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-neutral-600 sm:text-xs">
                Sin imagen del proyecto
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-3">
        <div className="min-w-0">
          <h2 className="atp-heading line-clamp-2 min-h-[2.65rem] text-[1.35rem] sm:text-[1.45rem]" title={project.nombre}>
            {project.nombre}
          </h2>
          <dl className="mt-1 space-y-0.5 text-xs leading-tight sm:text-sm">
            <div className="flex min-w-0 gap-1.5">
              <dt className="shrink-0 text-neutral-500">Género:</dt>
              <dd className={`truncate ${project.genero.trim() ? "text-neutral-300" : "text-neutral-500"}`} title={genre}>{genre}</dd>
            </div>
            <div className="flex min-w-0 gap-1.5">
              <dt className="shrink-0 text-neutral-500">Ciudad:</dt>
              <dd className={`truncate ${project.ciudad?.trim() ? "text-neutral-300" : "text-neutral-500"}`} title={city}>{city}</dd>
            </div>
          </dl>
        </div>

        <p
          className={`mt-2 line-clamp-2 min-h-[2.25rem] text-sm leading-snug ${project.descripcion?.trim() ? "text-neutral-300" : "text-neutral-500"}`}
          title={description}
        >
          {description}
        </p>

        <p className="mt-2 text-xs font-semibold text-neutral-300">
          <span className="text-neutral-500">Caché:</span>{" "}
          {hasCache ? `$${cacheAmount.toLocaleString("es-AR")}` : <span className="text-neutral-500">Sin definir</span>}
        </p>

        <div className="mt-auto flex justify-end border-t border-neutral-800 pt-2">
          <Link
            href={`/projects/${project.id}`}
            className="atp-button atp-button-secondary min-h-9 px-3 text-xs"
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </article>
  );
}
