import type { Prisma } from "@prisma/client";
import type { ProyectoMusicalInput } from "@/lib/validations/projects";

export const publicProjectListSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  genero: true,
  cacheAproximado: true,
  ubicacion: true,
  ciudad: true,
  imagenUrl: true,
  spotifyUrl: true,
  youtubeUrl: true,
  instagramUrl: true,
  sitioWebUrl: true,
  enlacesPersonalizados: true,
} satisfies Prisma.ProyectoMusicalSelect;

export const publicProjectDetailSelect = {
  ...publicProjectListSelect,
  creadoEn: true,
  usuario: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      fotoPerfilUrl: true,
    },
  },
  valoraciones: {
    select: {
      id: true,
      puntaje: true,
      comentario: true,
      creadoEn: true,
      autor: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
    },
  },
} satisfies Prisma.ProyectoMusicalSelect;

export function publicProjectWhere(filters?: {
  genre?: string | null;
  city?: string | null;
  search?: string | null;
}): Prisma.ProyectoMusicalWhereInput {
  const where: Prisma.ProyectoMusicalWhereInput = { estaActivo: true };

  if (filters?.genre) {
    where.genero = { contains: filters.genre, mode: "insensitive" };
  }
  if (filters?.city) {
    where.ciudad = { contains: filters.city, mode: "insensitive" };
  }
  if (filters?.search) {
    where.OR = [
      { nombre: { contains: filters.search, mode: "insensitive" } },
      { descripcion: { contains: filters.search, mode: "insensitive" } },
      { genero: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export function projectCreateData(
  userId: string,
  data: ProyectoMusicalInput
): Prisma.ProyectoMusicalUncheckedCreateInput {
  return {
    usuarioId: userId,
    nombre: data.nombre,
    genero: data.genero,
    descripcion: data.descripcion || null,
    cacheAproximado: data.cacheAproximado ?? null,
    ubicacion: data.ubicacion || null,
    ciudad: data.ciudad || null,
    imagenUrl: data.imagenUrl || null,
    spotifyUrl: data.spotifyUrl || null,
    youtubeUrl: data.youtubeUrl || null,
    instagramUrl: data.instagramUrl || null,
    sitioWebUrl: data.sitioWebUrl || null,
    enlacesPersonalizados: data.enlacesPersonalizados ?? [],
    estaActivo: true,
  };
}

export function projectUpdateData(
  data: Partial<ProyectoMusicalInput>
): Prisma.ProyectoMusicalUpdateInput {
  return {
    ...(data.nombre !== undefined && { nombre: data.nombre }),
    ...(data.genero !== undefined && { genero: data.genero }),
    ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
    ...(data.cacheAproximado !== undefined && {
      cacheAproximado: data.cacheAproximado ?? null,
    }),
    ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion || null }),
    ...(data.ciudad !== undefined && { ciudad: data.ciudad || null }),
    ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl || null }),
    ...(data.spotifyUrl !== undefined && { spotifyUrl: data.spotifyUrl || null }),
    ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl || null }),
    ...(data.instagramUrl !== undefined && { instagramUrl: data.instagramUrl || null }),
    ...(data.sitioWebUrl !== undefined && { sitioWebUrl: data.sitioWebUrl || null }),
    ...(data.enlacesPersonalizados !== undefined && {
      enlacesPersonalizados: data.enlacesPersonalizados,
    }),
  };
}
