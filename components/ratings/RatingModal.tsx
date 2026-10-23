"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRating } from "@/app/actions/ratings";
import { RockHandIcon } from "@/components/ratings/RockHandRating";
import { RockHandRatingSelector } from "@/components/ratings/RockHandRatingSelector";

export interface RatingModalProps {
  contractId: string;
  targetName: string;
  triggerLabel?: string;
  initiallyOpen?: boolean;
}

export function RatingModal({ contractId, targetName, triggerLabel, initiallyOpen = false }: RatingModalProps) {
  const router = useRouter();
  const titleId = useId();
  const scoreLabelId = useId();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

  async function handleRating(e: React.FormEvent) {
    e.preventDefault();

    if (score === null) {
      setFeedback({ error: true, message: "Selecciona una puntuación entre 1 y 5." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const result = await createRating({
      contratacionId: contractId,
      puntaje: score,
      comentario: comment,
    });

    if (result.error) {
      setIsLoading(false);
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "¡Valoración registrada con éxito!" });
      setTimeout(() => {
        closeModal();
        setIsLoading(false);
        router.refresh();
      }, 1200);
    }
  }

  function openModal() {
    setScore(null);
    setComment("");
    setFeedback(null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        className="atp-button atp-button-secondary text-xs"
      >
        <RockHandIcon size={18} />
        <span>{triggerLabel ?? `Calificar a ${targetName}`}</span>
      </button>

      {isOpen && (
        <div className="atp-modal-backdrop">
          <div
            className="atp-modal space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 id={titleId} className="atp-heading text-2xl">
                Valorar a {targetName}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                autoFocus
                aria-label="Cerrar formulario de valoración"
                className="text-lg font-bold text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            {feedback && (
              <div
                role={feedback.error ? "alert" : "status"}
                className={`atp-feedback ${
                  feedback.error
                    ? "atp-feedback-error"
                    : "atp-feedback-success"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleRating} className="space-y-4">
              <div>
                <span id={scoreLabelId} className="atp-label mb-2 block">
                  Puntuación
                </span>
                <RockHandRatingSelector
                  value={score}
                  onChange={setScore}
                  labelledBy={scoreLabelId}
                />
              </div>

              <div>
                <label htmlFor="rating-comment" className="atp-label mb-2 block">
                  Comentario o Reseña (Opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  id="rating-comment"
                  placeholder="Comparte tu experiencia trabajando juntos en la fecha..."
                  rows={3}
                  className="atp-field"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="atp-button atp-button-ghost text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || score === null}
                  aria-busy={isLoading}
                  className="atp-button atp-button-primary text-xs"
                >
                  {isLoading ? "Guardando..." : "Enviar Calificación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
