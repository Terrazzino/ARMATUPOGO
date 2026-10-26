"use client";

import { useId, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proyectoMusicalSchema, type ProyectoMusicalInput } from "@/lib/validations/projects";
import { createProject, updateProject } from "@/app/actions/projects";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { PROJECT_IMAGE_ACCEPT, PROJECT_IMAGE_MAX_BYTES } from "@/lib/project-image-constraints";
import {
  projectToFormValues,
  type EditableProject,
} from "@/lib/project-form-values";

export type { EditableProject } from "@/lib/project-form-values";

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="atp-label mb-2 block">{label}</label>{children}{error && <p className="mt-1 text-xs font-medium text-red-300">{error}</p>}</div>;
}

function ProjectModal({ mode, project, initiallyOpen = false }: { mode: "create" | "edit"; project?: EditableProject; initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const defaults = projectToFormValues(project);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProyectoMusicalInput>({ resolver: zodResolver(proyectoMusicalSchema), defaultValues: defaults });
  const links = useFieldArray({ control, name: "enlacesPersonalizados" });
  const projectName = useWatch({ control, name: "nombre" });

  function resetDraft() {
    reset(defaults);
    setSelectedImage(null);
    setRemoveImage(false);
    setServerError(null);
  }

  function closeModal() {
    resetDraft();
    setIsOpen(false);
    window.requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }

  async function onSubmit(data: ProyectoMusicalInput) {
    setIsLoading(true);
    setServerError(null);
    const formData = new FormData();
    const projectPayload = { ...data };
    delete projectPayload.imagenUrl;
    formData.set("project", JSON.stringify(projectPayload));
    formData.set("imageAction", selectedImage ? "replace" : removeImage ? "remove" : "keep");
    if (selectedImage) formData.set("image", selectedImage);

    let result;
    try {
      result = mode === "edit" && project ? await updateProject(project.id, formData) : await createProject(formData);
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
    setIsOpen(false);
  }

  const title = mode === "edit" ? "Editar Proyecto Musical" : "Nuevo Proyecto Musical";

  return (
    <>
      <button id={triggerId} type="button" onClick={() => setIsOpen(true)} className={`atp-button text-sm ${mode === "edit" ? "atp-button-secondary" : "atp-button-primary"}`}>
        {mode === "create" && <span aria-hidden="true">+</span>}
        <span>{mode === "edit" ? "Editar proyecto" : "Crear Proyecto Musical"}</span>
      </button>
      {isOpen && (
        <div className="atp-modal-backdrop">
          <div className="atp-modal my-4" role="dialog" aria-modal="true" aria-labelledby={`${triggerId}-title`}>
            <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 id={`${triggerId}-title`} className="atp-heading text-2xl">{title}</h3>
              <button type="button" onClick={closeModal} aria-label="Cerrar formulario de proyecto" className="text-xl font-bold text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><span aria-hidden="true">✕</span></button>
            </div>
            {serverError && <div className="atp-feedback atp-feedback-error mb-4" role="alert">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre Artístico *" id={`${triggerId}-name`} error={errors.nombre?.message}><input {...register("nombre")} id={`${triggerId}-name`} autoFocus type="text" placeholder="Ej: Los Pogo Boys" disabled={isLoading} aria-invalid={Boolean(errors.nombre)} className="atp-field" /></Field>
                <Field label="Género Musical *" id={`${triggerId}-genre`} error={errors.genero?.message}><input {...register("genero")} id={`${triggerId}-genre`} type="text" placeholder="Ej: Punk Rock / Indie" disabled={isLoading} aria-invalid={Boolean(errors.genero)} className="atp-field" /></Field>
              </div>
              <Field label="Descripción y Propuesta" id={`${triggerId}-description`} error={errors.descripcion?.message}><textarea {...register("descripcion")} id={`${triggerId}-description`} rows={3} placeholder="Sonido, trayectoria e integrantes..." disabled={isLoading} aria-invalid={Boolean(errors.descripcion)} className="atp-field" /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Caché orientativo ($)" id={`${triggerId}-fee`} error={errors.cacheAproximado?.message}><input {...register("cacheAproximado", { setValueAs: (value) => value === "" ? null : Number(value) })} id={`${triggerId}-fee`} type="number" min="0" placeholder="50000" disabled={isLoading} aria-invalid={Boolean(errors.cacheAproximado)} className="atp-field" /></Field>
                <Field label="Ciudad" id={`${triggerId}-city`}><input {...register("ciudad")} id={`${triggerId}-city`} type="text" placeholder="CABA" disabled={isLoading} className="atp-field" /></Field>
                <Field label="Zona / Barrio" id={`${triggerId}-location`}><input {...register("ubicacion")} id={`${triggerId}-location`} type="text" placeholder="Palermo / Almagro" disabled={isLoading} className="atp-field" /></Field>
              </div>
              <ImageUploadField label="Imagen del proyecto (opcional)" helpText="JPG, PNG o WebP estático. Máximo 5 MiB, entre 64×64 y 4096×4096 px." accept={PROJECT_IMAGE_ACCEPT} maxBytes={PROJECT_IMAGE_MAX_BYTES} currentImageUrl={project?.imagenUrl} previewAlt={`Vista previa de ${projectName || "la imagen del proyecto"}`} selectedFile={selectedImage} removed={removeImage} disabled={isLoading} onSelect={(file) => { setSelectedImage(file); setRemoveImage(false); }} onClearSelection={() => setSelectedImage(null)} onRemove={() => setRemoveImage(true)} onRestore={() => setRemoveImage(false)} />
              <div className="grid grid-cols-1 gap-4 border-t border-neutral-800 pt-4 sm:grid-cols-2">
                <Field label="Link de Spotify" id={`${triggerId}-spotify`} error={errors.spotifyUrl?.message}><input {...register("spotifyUrl")} id={`${triggerId}-spotify`} type="url" placeholder="https://open.spotify.com/..." disabled={isLoading} className="atp-field" /></Field>
                <Field label="Link de YouTube" id={`${triggerId}-youtube`} error={errors.youtubeUrl?.message}><input {...register("youtubeUrl")} id={`${triggerId}-youtube`} type="url" placeholder="https://youtube.com/..." disabled={isLoading} className="atp-field" /></Field>
                <Field label="Link de Instagram" id={`${triggerId}-instagram`} error={errors.instagramUrl?.message}><input {...register("instagramUrl")} id={`${triggerId}-instagram`} type="url" placeholder="https://instagram.com/..." disabled={isLoading} className="atp-field" /></Field>
                <Field label="Sitio Web / Linktree" id={`${triggerId}-website`} error={errors.sitioWebUrl?.message}><input {...register("sitioWebUrl")} id={`${triggerId}-website`} type="url" placeholder="https://linktr.ee/..." disabled={isLoading} className="atp-field" /></Field>
              </div>
              <fieldset className="space-y-3 border-t border-neutral-800 pt-4">
                <legend className="atp-label">Otros enlaces</legend>
                {links.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                    <input {...register(`enlacesPersonalizados.${index}.title`)} aria-label={`Título del enlace ${index + 1}`} placeholder="Título" disabled={isLoading} className="atp-field" />
                    <input {...register(`enlacesPersonalizados.${index}.url`)} aria-label={`URL del enlace ${index + 1}`} type="url" placeholder="https://..." disabled={isLoading} className="atp-field" />
                    <button type="button" onClick={() => links.remove(index)} disabled={isLoading} className="atp-button atp-button-ghost text-xs">Quitar</button>
                  </div>
                ))}
                {errors.enlacesPersonalizados?.message && <p className="text-xs font-medium text-red-300">{errors.enlacesPersonalizados.message}</p>}
                <button type="button" onClick={() => links.append({ title: "", url: "" })} disabled={isLoading} className="atp-button atp-button-secondary text-xs">Agregar enlace</button>
              </fieldset>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                <button type="button" onClick={closeModal} disabled={isLoading} className="atp-button atp-button-ghost text-sm">Cancelar</button>
                <button type="submit" disabled={isLoading} aria-busy={isLoading} className="atp-button atp-button-primary text-sm">{isLoading ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar Proyecto"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function CreateProjectModal({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  return <ProjectModal mode="create" initiallyOpen={initiallyOpen} />;
}

export function EditProjectModal({ project, initiallyOpen = false }: { project: EditableProject; initiallyOpen?: boolean }) {
  return <ProjectModal mode="edit" project={project} initiallyOpen={initiallyOpen} />;
}
