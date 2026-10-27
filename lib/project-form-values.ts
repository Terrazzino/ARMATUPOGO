import type { ProyectoMusicalInput } from "@/lib/validations/projects";

export type EditableProject = {
  id: string;
  nombre: string;
  genero: string;
  descripcion?: string | null;
  cacheAproximado?: number | null;
  ubicacion?: string | null;
  ciudad?: string | null;
  imagenUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  sitioWebUrl?: string | null;
  enlacesPersonalizados?: Array<{ title: string; url: string }>;
};

export const EMPTY_PROJECT_FORM_VALUES: ProyectoMusicalInput = {
  nombre: "",
  genero: "",
  descripcion: "",
  cacheAproximado: null,
  ciudad: "",
  imagenUrl: "",
  spotifyUrl: "",
  youtubeUrl: "",
  instagramUrl: "",
  sitioWebUrl: "",
  enlacesPersonalizados: [],
};

/**
 * Construye exclusivamente los campos expuestos por el formulario y aceptados
 * por el esquema estricto. El id queda fuera del estado y `ubicacion` se omite
 * para que una edición no borre valores históricos que ya no son editables.
 */
export function projectToFormValues(project?: EditableProject): ProyectoMusicalInput {
  if (!project) return { ...EMPTY_PROJECT_FORM_VALUES, enlacesPersonalizados: [] };

  return {
    nombre: project.nombre,
    genero: project.genero,
    descripcion: project.descripcion ?? "",
    cacheAproximado: project.cacheAproximado ?? null,
    ciudad: project.ciudad ?? "",
    imagenUrl: project.imagenUrl ?? "",
    spotifyUrl: project.spotifyUrl ?? "",
    youtubeUrl: project.youtubeUrl ?? "",
    instagramUrl: project.instagramUrl ?? "",
    sitioWebUrl: project.sitioWebUrl ?? "",
    enlacesPersonalizados: project.enlacesPersonalizados?.map((link) => ({
      title: link.title,
      url: link.url,
    })) ?? [],
  };
}
