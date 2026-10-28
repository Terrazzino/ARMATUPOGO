"use client";

import { useId, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventoCreateSchema,
  eventoEditFormSchema,
  type EventoFormValues,
} from "@/lib/validations/events";
import { createEvent } from "@/app/actions/events";
import { updateEvent } from "@/app/actions/events";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { EVENT_IMAGE_ACCEPT, EVENT_IMAGE_MAX_BYTES } from "@/lib/event-image-constraints";
import { eventToFormValues, type EditableEvent } from "@/lib/event-form-values";

function EventModal({ mode, event, initiallyOpen = false }: { mode: "create" | "edit"; event?: EditableEvent; initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const defaults = eventToFormValues(event);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EventoFormValues>({
    // En creación el precio es obligatorio; al editar es opcional por los eventos históricos sin Entrada.
    resolver: zodResolver(
      mode === "create" ? eventoCreateSchema : eventoEditFormSchema
    ) as Resolver<EventoFormValues>,
    defaultValues: defaults,
  });
  const eventTitle = useWatch({ control, name: "titulo" });
  const datesLocked = mode === "edit" && event?.hasActiveContracts;

  async function onSubmit(data: EventoFormValues) {
    setIsLoading(true);
    setServerError(null);

    const formData = new FormData();
    const payload: Partial<EventoFormValues> = { ...data };
    delete payload.bannerUrl;
    if (datesLocked) {
      delete payload.startsAt;
      delete payload.endsAt;
    }
    formData.set("event", JSON.stringify(payload));
    formData.set("imageAction", selectedImage ? "replace" : removeImage ? "remove" : "keep");
    if (selectedImage) formData.set("image", selectedImage);

    let result;
    try {
      result = mode === "edit" && event
        ? await updateEvent(event.id, formData)
        : await createEvent(formData);
    } catch {
      setIsLoading(false);
      setServerError("No se pudo completar la operación. Intentá nuevamente.");
      return;
    }
    setIsLoading(false);

    if (result.error) {
      setServerError(result.message);
      return;
    }

    if ("warning" in result && result.warning) window.alert(result.warning);
    reset(defaults);
    setSelectedImage(null);
    setRemoveImage(false);
    closeModal();
  }

  function closeModal() {
    reset(defaults);
    setSelectedImage(null);
    setRemoveImage(false);
    setServerError(null);
    setIsOpen(false);
    window.requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }

  return (
    <>
      <button
        id={triggerId}
        type="button"
        onClick={() => setIsOpen(true)}
        className={`atp-button text-sm ${mode === "edit" ? "atp-button-secondary min-h-9 px-3 text-xs" : "atp-button-primary"}`}
      >
        {mode === "create" && <span aria-hidden="true">+</span>}
        <span>{mode === "edit" ? "Editar evento" : "Publicar Nuevo Evento"}</span>
      </button>

      {isOpen && (
        <div className="atp-modal-backdrop">
          <div
            className="atp-modal my-4 max-h-[calc(100dvh-2rem)] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${triggerId}-title`}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 id={`${triggerId}-title`} className="atp-heading text-2xl">
                {mode === "edit" ? "Editar Evento" : "Publicar Recital o Fecha"}
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

            {datesLocked && (
              <div className="atp-feedback mb-4" role="status">
                Las fechas no pueden cambiarse porque existen contrataciones activas. Podés editar los demás datos.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-left">
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

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label htmlFor="event-start" className="atp-label mb-2 block">
                    Inicio del evento *
                  </label>
                  <input
                    {...register("startsAt")}
                    id="event-start"
                    type="datetime-local"
                    disabled={isLoading}
                    readOnly={datesLocked}
                    aria-disabled={datesLocked}
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
                    readOnly={datesLocked}
                    aria-disabled={datesLocked}
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
                    max="50"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.cantidadMusicosRequerida)}
                    className="atp-field"
                  />
                  {errors.cantidadMusicosRequerida && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.cantidadMusicosRequerida.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:items-start">
                <div className="grid grid-rows-[2.75rem_auto_auto]">
                  <label htmlFor="event-venue" className="atp-label flex items-end pb-2">
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

                <div className="grid grid-rows-[2.75rem_auto_auto]">
                  <label htmlFor="event-location" className="atp-label flex items-end pb-2">
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

                <div className="grid grid-rows-[2.75rem_auto_auto]">
                  <label htmlFor="event-city" className="atp-label flex items-end pb-2">
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

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:items-start">
                <div>
                  <label htmlFor="event-ticket-price" className="atp-label mb-2 block">
                    Precio de entrada ($){mode === "create" ? " *" : ""}
                  </label>
                  <input
                    {...register("precioEntrada", {
                      setValueAs: (value) => value === "" || value == null ? undefined : Number(value),
                    })}
                    id="event-ticket-price"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    placeholder="Ej: 10000"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.precioEntrada)}
                    aria-describedby="event-ticket-price-help"
                    className="atp-field"
                  />
                  <p id="event-ticket-price-help" className="mt-1 text-xs text-neutral-400">
                    Ingresá 0 si la entrada es gratuita.
                  </p>
                  {errors.precioEntrada && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.precioEntrada.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="event-fee" className="atp-label mb-2 block">
                    Caché Ofrecido ($) (Opcional)
                  </label>
                  <input
                    {...register("cacheOfrecido", { setValueAs: (value) => value === "" ? null : Number(value) })}
                    id="event-fee"
                    type="number"
                    placeholder="Ej: 80000"
                    min="0"
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Flyer del recital (opcional)"
                helpText={mode === "create"
                  ? "Publicá primero el evento y agregá el flyer desde Editar evento. El modelo actual no admite una carga provisional privada segura."
                  : "JPG, PNG o WebP estático. Máximo 5 MiB, entre 400×500 y 4000×5000 px."}
                accept={EVENT_IMAGE_ACCEPT}
                maxBytes={EVENT_IMAGE_MAX_BYTES}
                currentImageUrl={event?.bannerUrl}
                previewAlt={`Vista previa del flyer de ${eventTitle || "el recital"}`}
                selectedFile={selectedImage}
                removed={removeImage}
                disabled={isLoading || mode === "create"}
                previewClassName="aspect-[4/5]"
                onSelect={(file) => { setSelectedImage(file); setRemoveImage(false); }}
                onClearSelection={() => setSelectedImage(null)}
                onRemove={() => setRemoveImage(true)}
                onRestore={() => setRemoveImage(false)}
              />

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

              <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 bg-neutral-950 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
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
                  {isLoading ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Publicar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function CreateEventModal({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  return <EventModal mode="create" initiallyOpen={initiallyOpen} />;
}

export function EditEventModal({ event, initiallyOpen = false }: { event: EditableEvent; initiallyOpen?: boolean }) {
  return <EventModal mode="edit" event={event} initiallyOpen={initiallyOpen} />;
}
