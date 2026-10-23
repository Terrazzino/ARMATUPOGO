"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventoSchema, type EventoInput } from "@/lib/validations/events";
import { createEvent } from "@/app/actions/events";

export function CreateEventModal({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerId = useId();
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
    closeModal();
  }

  function closeModal() {
    setIsOpen(false);
    window.requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }

  return (
    <>
      <button
        id={triggerId}
        type="button"
        onClick={() => setIsOpen(true)}
        className="atp-button atp-button-primary text-sm"
      >
        <span aria-hidden="true">+</span>
        <span>Publicar Nuevo Evento</span>
      </button>

      {isOpen && (
        <div className="atp-modal-backdrop">
          <div
            className="atp-modal my-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 id="create-event-title" className="atp-heading text-2xl">
                Publicar Recital o Fecha
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar formulario de evento"
                className="text-xl font-bold text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            {serverError && (
              <div className="atp-feedback atp-feedback-error mb-4" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div>
                <label htmlFor="event-title" className="atp-label mb-2 block">
                  Nombre del Recital / Fecha *
                </label>
                <input
                  {...register("titulo")}
                  id="event-title"
                  autoFocus
                  type="text"
                  placeholder="Ej: Noche de Punk Rock en Palermo"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.titulo)}
                  className="atp-field"
                />
                {errors.titulo && (
                  <p className="mt-1 text-xs font-medium text-red-300">{errors.titulo.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="event-start" className="atp-label mb-2 block">
                    Inicio del evento *
                  </label>
                  <input
                    {...register("startsAt")}
                    id="event-start"
                    type="datetime-local"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.startsAt)}
                    className="atp-field"
                  />
                  {errors.startsAt && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.startsAt.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="event-end" className="atp-label mb-2 block">
                    Fin del evento *
                  </label>
                  <input
                    {...register("endsAt")}
                    id="event-end"
                    type="datetime-local"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.endsAt)}
                    className="atp-field"
                  />
                  {errors.endsAt && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.endsAt.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="event-capacity" className="atp-label mb-2 block">
                    Cupos de Bandas Requeridos *
                  </label>
                  <input
                    {...register("cantidadMusicosRequerida", { valueAsNumber: true })}
                    id="event-capacity"
                    type="number"
                    min="1"
                    max="20"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.cantidadMusicosRequerida)}
                    className="atp-field"
                  />
                  {errors.cantidadMusicosRequerida && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.cantidadMusicosRequerida.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="event-venue" className="atp-label mb-2 block">
                    Nombre del Recinto / Sala
                  </label>
                  <input
                    {...register("nombreLugar")}
                    id="event-venue"
                    type="text"
                    placeholder="Ej: Club Lucille"
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>

                <div>
                  <label htmlFor="event-location" className="atp-label mb-2 block">
                    Dirección / Ubicación *
                  </label>
                  <input
                    {...register("ubicacion")}
                    id="event-location"
                    type="text"
                    placeholder="Gorriti 5520"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.ubicacion)}
                    className="atp-field"
                  />
                  {errors.ubicacion && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.ubicacion.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="event-city" className="atp-label mb-2 block">
                    Ciudad
                  </label>
                  <input
                    {...register("ciudad")}
                    id="event-city"
                    type="text"
                    placeholder="CABA"
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-fee" className="atp-label mb-2 block">
                  Caché Ofrecido ($) (Opcional)
                </label>
                <input
                  {...register("cacheOfrecido", { valueAsNumber: true })}
                  id="event-fee"
                  type="number"
                  placeholder="Ej: 80000"
                  min="0"
                  disabled={isLoading}
                  className="atp-field"
                />
              </div>

              <div>
                <label htmlFor="event-description" className="atp-label mb-2 block">
                  Descripción y Requerimientos Técnicos
                </label>
                <textarea
                  {...register("descripcion")}
                  id="event-description"
                  placeholder="Detalles sobre backline disponible, pruebas de sonido, horarios y propuesta del recital..."
                  disabled={isLoading}
                  rows={3}
                  className="atp-field"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="atp-button atp-button-ghost text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="atp-button atp-button-primary text-sm"
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
