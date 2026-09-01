"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventoSchema, type EventoInput } from "@/lib/validations/events";
import { createEvent } from "@/app/actions/events";

export function CreateEventModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventoInput>({
    resolver: zodResolver(eventoSchema),
    defaultValues: {
      cantidadMusicosRequerida: 2,
      estado: "PUBLICADO",
    },
  });

  async function onSubmit(data: EventoInput) {
    setIsLoading(true);
    setServerError(null);

    const result = await createEvent(data);
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
        <span>Publicar Nuevo Evento</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Publicar Recital o Fecha
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre del Recital / Fecha *
                </label>
                <input
                  {...register("titulo")}
                  type="text"
                  placeholder="Ej: Noche de Punk Rock en Palermo"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
                {errors.titulo && (
                  <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Fecha y Hora *
                  </label>
                  <input
                    {...register("fechaEvento")}
                    type="datetime-local"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.fechaEvento && (
                    <p className="text-xs text-red-500 mt-1">{errors.fechaEvento.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Cupos de Bandas Requeridos *
                  </label>
                  <input
                    {...register("cantidadMusicosRequerida", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="20"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.cantidadMusicosRequerida && (
                    <p className="text-xs text-red-500 mt-1">{errors.cantidadMusicosRequerida.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nombre del Recinto / Sala
                  </label>
                  <input
                    {...register("nombreLugar")}
                    type="text"
                    placeholder="Ej: Club Lucille"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Dirección / Ubicación *
                  </label>
                  <input
                    {...register("ubicacion")}
                    type="text"
                    placeholder="Gorriti 5520"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                  {errors.ubicacion && (
                    <p className="text-xs text-red-500 mt-1">{errors.ubicacion.message}</p>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Caché Ofrecido ($) (Opcional)
                </label>
                <input
                  {...register("cacheOfrecido", { valueAsNumber: true })}
                  type="number"
                  placeholder="Ej: 80000"
                  min="0"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Descripción y Requerimientos Técnicos
                </label>
                <textarea
                  {...register("descripcion")}
                  placeholder="Detalles sobre backline disponible, pruebas de sonido, horarios y propuesta del recital..."
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
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
                  {isLoading ? "Publicando..." : "Publicar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}