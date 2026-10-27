"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyToEvent } from "@/app/actions/contracts";
import {
  musicianOpportunityLabels,
  type MusicianOpportunityState,
} from "@/lib/musician-event-board";

export interface ProjectOption {
  id: string;
  nombre: string;
  state: MusicianOpportunityState;
}

export interface ApplyToEventModalProps {
  eventId: string;
  eventTitle: string;
  projects: ProjectOption[];
  disabledReason?: string;
  initiallyOpen?: boolean;
}

export function ApplyToEventModal({
  eventId,
  eventTitle,
  projects,
  disabledReason,
  initiallyOpen = false,
}: ApplyToEventModalProps) {
  const router = useRouter();
  const titleId = useId();
  const availableProjects = projects.filter((project) => project.state === "DISPONIBLE");
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(availableProjects[0]?.id ?? "");
  const [offerAmount, setOfferAmount] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const unavailableReason = disabledReason
    ?? (projects.length === 0
      ? "Necesitás registrar un proyecto musical activo antes de postularte."
      : availableProjects.length === 0
        ? "Todos tus proyectos activos ya tienen una relación con este evento."
        : undefined);

  function closeModal() {
    if (isPending) return;
    setIsOpen(false);
    setFeedback(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openModal() {
    setSelectedProjectId(availableProjects[0]?.id ?? "");
    setOfferAmount("");
    setMessage("");
    setFeedback(null);
    setIsOpen(true);
  }

  function submitPostulation() {
    if (!selectedProjectId) return;
    setFeedback(null);

    const parsedAmount = offerAmount.trim() === "" ? undefined : Number(offerAmount);
    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setFeedback({ error: true, message: "Ingresa un caché pretendido válido." });
      return;
    }

    startTransition(async () => {
      const result = await applyToEvent(
        eventId,
        selectedProjectId,
        parsedAmount,
        message
      );

      if (result.error) {
        setFeedback({
          error: true,
          message: result.message ?? "No se pudo enviar la postulación.",
        });
        return;
      }

      setFeedback({ error: false, message: "Postulación enviada correctamente." });
      router.refresh();
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        disabled={Boolean(unavailableReason)}
        className="atp-button atp-button-primary w-full px-3 text-xs uppercase tracking-[0.08em]"
      >
        Postular mi banda
      </button>
      {unavailableReason && (
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">{unavailableReason}</p>
      )}

      {isOpen && (
        <div
          className="atp-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeModal();
            }}
            className="atp-modal"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="atp-kicker">Confirmar envío</p>
                <h2 id={titleId} className="atp-heading mt-1 text-3xl">
                  Postular a {eventTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                aria-label="Cerrar"
                className="atp-button atp-button-ghost min-h-10 px-3 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label htmlFor={`${titleId}-project`} className="atp-label">
                Proyecto musical
              </label>
              <select
                id={`${titleId}-project`}
                autoFocus
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={isPending || Boolean(feedback && !feedback.error)}
                className="atp-field mt-2"
              >
                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    disabled={project.state !== "DISPONIBLE"}
                  >
                    {project.nombre} - {musicianOpportunityLabels[project.state]}
                  </option>
                ))}
              </select>

              <label htmlFor={`${titleId}-amount`} className="atp-label mt-5 block">
                Caché pretendido (opcional)
              </label>
              <input
                id={`${titleId}-amount`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={offerAmount}
                onChange={(event) => setOfferAmount(event.target.value)}
                disabled={isPending || Boolean(feedback && !feedback.error)}
                placeholder="Ej.: 50000"
                className="atp-field mt-2"
              />

              <label htmlFor={`${titleId}-message`} className="atp-label mt-5 block">
                Mensaje al organizador (opcional)
              </label>
              <textarea
                id={`${titleId}-message`}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={isPending || Boolean(feedback && !feedback.error)}
                maxLength={1000}
                rows={3}
                placeholder="Contá brevemente tu propuesta o necesidades técnicas."
                className="atp-field mt-2"
              />

              <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                Al confirmar, enviaremos este proyecto al organizador. La postulación quedará
                pendiente hasta que sea aceptada o rechazada.
              </p>
            </div>

            {feedback && (
              <p
                role="status"
                className={`atp-feedback mt-5 text-sm ${
                  feedback.error ? "atp-feedback-error" : "atp-feedback-success"
                }`}
              >
                {feedback.message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="atp-button atp-button-secondary"
              >
                {feedback && !feedback.error ? "Cerrar" : "Volver"}
              </button>
              {(!feedback || feedback.error) && (
                <button
                  type="button"
                  onClick={submitPostulation}
                  disabled={isPending || !selectedProjectId}
                  aria-busy={isPending}
                  className="atp-button atp-button-primary"
                >
                  {isPending ? "Enviando..." : "Confirmar postulación"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
