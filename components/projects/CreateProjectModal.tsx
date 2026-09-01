"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proyectoMusicalSchema, type ProyectoMusicalInput } from "@/lib/validations/projects";
import { createProject } from "@/app/actions/projects";

export function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProyectoMusicalInput>({
    resolver: zodResolver(proyectoMusicalSchema),
  });

  async function onSubmit(data: ProyectoMusicalInput) {
    setIsLoading(true);
    setServerError(null);

    const result = await createProject(data);
    setIsLoading(false);

    if (result.error) {
      setServerError(result.message);
      return;
    }

    reset();
    setIsOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
      >
        <span>+</span>
        <span>Crear Proyecto Musical</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Nuevo Proyecto Musical
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {serverError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nombre Artístico *
                  </label>
                  <input
                    {...register("nombre")}
                    type="text"
                    placeholder="Ej: Los Pogo Boys"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.nombre && (
                    <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Género Musical *
                  </label>
                  <input
                    {...register("genero")}
                    type="text"
                    placeholder="Ej: Punk Rock / Indie"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.genero && (
                    <p className="text-xs text-red-500 mt-1">{errors.genero.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Descripción y Propuesta
                </label>
                <textarea
                  {...register("descripcion")}
                  placeholder="Cuéntale a los organizadores sobre el sonido de la banda, trayectoria e integrantes..."
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
                {errors.descripcion && (
                  <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Caché orientativo ($)
                  </label>
                  <input
                    {...register("cacheAproximado", { valueAsNumber: true })}
                    type="number"
                    placeholder="50000"
                    min="0"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.cacheAproximado && (
                    <p className="text-xs text-red-500 mt-1">{errors.cacheAproximado.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Ciudad
                  </label>
                  <input
                    {...register("ciudad")}
                    type="text"
                    placeholder="CABA"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Zona / Barrio
                  </label>
                  <input
                    {...register("ubicacion")}
                    type="text"
                    placeholder="Palermo / Almagro"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Link de Spotify
                  </label>
                  <input
                    {...register("spotifyUrl")}
                    type="url"
                    placeholder="https://open.spotify.com/..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Link de YouTube
                  </label>
                  <input
                    {...register("youtubeUrl")}
                    type="url"
                    placeholder="https://youtube.com/..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Link de Instagram
                  </label>
                  <input
                    {...register("instagramUrl")}
                    type="url"
                    placeholder="https://instagram.com/..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Sitio Web / Linktree
                  </label>
                  <input
                    {...register("sitioWebUrl")}
                    type="url"
                    placeholder="https://linktr.ee/..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isLoading ? "Creando..." : "Guardar Proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}