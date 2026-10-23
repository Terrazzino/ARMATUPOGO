"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proyectoMusicalSchema, type ProyectoMusicalInput } from "@/lib/validations/projects";
import { createProject } from "@/app/actions/projects";

export function CreateProjectModal({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerId = useId();
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
        <span>Crear Proyecto Musical</span>
      </button>

      {isOpen && (
        <div className="atp-modal-backdrop">
          <div
            className="atp-modal my-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
          >
            <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 id="create-project-title" className="atp-heading text-2xl">
                Nuevo Proyecto Musical
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar formulario de proyecto"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="project-name" className="atp-label mb-2 block">
                    Nombre Artístico *
                  </label>
                  <input
                    {...register("nombre")}
                    id="project-name"
                    autoFocus
                    type="text"
                    placeholder="Ej: Los Pogo Boys"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.nombre)}
                    className="atp-field"
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-genre" className="atp-label mb-2 block">
                    Género Musical *
                  </label>
                  <input
                    {...register("genero")}
                    id="project-genre"
                    type="text"
                    placeholder="Ej: Punk Rock / Indie"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.genero)}
                    className="atp-field"
                  />
                  {errors.genero && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.genero.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="project-description" className="atp-label mb-2 block">
                  Descripción y Propuesta
                </label>
                <textarea
                  {...register("descripcion")}
                  id="project-description"
                  placeholder="Cuéntale a los organizadores sobre el sonido de la banda, trayectoria e integrantes..."
                  disabled={isLoading}
                  rows={3}
                  aria-invalid={Boolean(errors.descripcion)}
                  className="atp-field"
                />
                {errors.descripcion && (
                  <p className="mt-1 text-xs font-medium text-red-300">{errors.descripcion.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="project-fee" className="atp-label mb-2 block">
                    Caché orientativo ($)
                  </label>
                  <input
                    {...register("cacheAproximado", { valueAsNumber: true })}
                    id="project-fee"
                    type="number"
                    placeholder="50000"
                    min="0"
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.cacheAproximado)}
                    className="atp-field"
                  />
                  {errors.cacheAproximado && (
                    <p className="mt-1 text-xs font-medium text-red-300">{errors.cacheAproximado.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-city" className="atp-label mb-2 block">
                    Ciudad
                  </label>
                  <input
                    {...register("ciudad")}
                    id="project-city"
                    type="text"
                    placeholder="CABA"
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>

                <div>
                  <label htmlFor="project-location" className="atp-label mb-2 block">
                    Zona / Barrio
                  </label>
                  <input
                    {...register("ubicacion")}
                    id="project-location"
                    type="text"
                    placeholder="Palermo / Almagro"
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-neutral-800 pt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="project-spotify" className="atp-label mb-2 block">
                    Link de Spotify
                  </label>
                  <input
                    {...register("spotifyUrl")}
                    id="project-spotify"
                    type="url"
                    placeholder="https://open.spotify.com/..."
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>

                <div>
                  <label htmlFor="project-youtube" className="atp-label mb-2 block">
                    Link de YouTube
                  </label>
                  <input
                    {...register("youtubeUrl")}
                    id="project-youtube"
                    type="url"
                    placeholder="https://youtube.com/..."
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>

                <div>
                  <label htmlFor="project-instagram" className="atp-label mb-2 block">
                    Link de Instagram
                  </label>
                  <input
                    {...register("instagramUrl")}
                    id="project-instagram"
                    type="url"
                    placeholder="https://instagram.com/..."
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>

                <div>
                  <label htmlFor="project-website" className="atp-label mb-2 block">
                    Sitio Web / Linktree
                  </label>
                  <input
                    {...register("sitioWebUrl")}
                    id="project-website"
                    type="url"
                    placeholder="https://linktr.ee/..."
                    disabled={isLoading}
                    className="atp-field"
                  />
                </div>
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
