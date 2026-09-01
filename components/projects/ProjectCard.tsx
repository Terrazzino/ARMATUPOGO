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
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Header with avatar / banner */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-purple-700 border-2 border-white/20 flex items-center justify-center text-2xl font-bold uppercase shrink-0">
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
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>📍</span> {project.ciudad}{project.ubicacion ? ` - ${project.ubicacion}` : ""}
            </p>
          )}

          {project.descripcion && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
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
        <div className="flex items-center gap-3 text-sm text-gray-500 pt-2 border-t border-slate-100 dark:border-slate-700">
          {project.spotifyUrl && (
            <a
              href={project.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 font-medium text-xs flex items-center gap-1"
            >
              <span>🟢 Spotify</span>
            </a>
          )}
          {project.youtubeUrl && (
            <a
              href={project.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 font-medium text-xs flex items-center gap-1"
            >
              <span>🔴 YouTube</span>
            </a>
          )}
          {project.instagramUrl && (
            <a
              href={project.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-700 font-medium text-xs flex items-center gap-1"
            >
              <span>📷 Instagram</span>
            </a>
          )}
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="w-full text-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Ver Perfil Artístico
        </Link>
      </div>
    </div>
  );
}