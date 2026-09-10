import Link from "next/link";

interface ProjectCardProps {
  project: {
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
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
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