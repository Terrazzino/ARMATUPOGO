"use client";

import { useRef, useState } from "react";
import { inviteProject } from "@/app/actions/contracts";

export interface InviteModalProps {
  projectId: string;
  projectName: string;
  events: Array<{
    id: string;
    titulo: string;
    startsAt: Date | string;
  }>;
  initiallyOpen?: boolean;
}

export function InviteModal({ projectId, projectName, events, initiallyOpen = false }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

  function closeModal() {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) {
      setFeedback({ error: true, message: "Debes seleccionar un evento" });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const amountNum = offerAmount ? parseFloat(offerAmount) : undefined;
    const result = await inviteProject(selectedEventId, projectId, amountNum, message);

    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "¡Invitación enviada con éxito! Podrás negociar desde tu panel." });
      setTimeout(() => {
        closeModal();
      }, 2000);
    }
  }

  if (events.length === 0) {
    return (
      <div className="border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
        <p className="font-bold text-neutral-200">¿Querés contratar a {projectName}?</p>
        <p className="mt-1 max-w-xl">
          Primero debes publicar un evento activo desde tu panel de organizador.
        </p>
        <a
          href="/dashboard/organizer"
          className="atp-button atp-button-secondary mt-4 min-h-10 px-4 text-sm"
        >
          Publicar un evento
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="atp-button atp-button-primary min-h-10 w-full px-4 text-sm uppercase tracking-[0.08em] sm:w-auto"
      >
        <span>Invitar a mi evento</span>
      </button>

      {isOpen && (
        <div className="atp-modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            className="atp-modal"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <p className="atp-kicker">Nueva invitación</p>
                <h3 id="invite-modal-title" className="atp-heading mt-1 text-3xl">Invitar a {projectName}</h3>
                <p className="mt-2 text-sm text-neutral-400">Seleccioná el recital al que deseás invitar a esta banda.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar invitación"
                className="atp-button atp-button-ghost min-h-9 shrink-0 px-3 text-xl"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                role={feedback.error ? "alert" : "status"}
                className={`atp-feedback mb-4 text-sm ${
                  feedback.error
                    ? "atp-feedback-error"
                    : "atp-feedback-success"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="invite-event" className="atp-label mb-1.5 block text-neutral-400">
                  Seleccioná tu evento
                </label>
                <select
                  id="invite-event"
                  autoFocus
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={isLoading}
                  className="atp-field text-sm"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.titulo} ({new Date(ev.startsAt).toLocaleDateString("es-AR")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="invite-amount" className="atp-label mb-1.5 block text-neutral-400">
                  Propuesta inicial de caché ($) (opcional)
                </label>
                <input
                  id="invite-amount"
                  type="number"
                  placeholder="Ej: 60000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  className="atp-field text-sm"
                />
              </div>

              <div>
                <label htmlFor="invite-message" className="atp-label mb-1.5 block text-neutral-400">
                  Mensaje o condiciones de la propuesta
                </label>
                <textarea
                  id="invite-message"
                  placeholder="Hola! Nos gustaría contar con tu proyecto para esta fecha..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="atp-field resize-y text-sm"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="atp-button atp-button-ghost min-h-10 px-4 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="atp-button atp-button-primary min-h-10 px-4 text-sm"
                >
                  {isLoading ? "Enviando..." : "Enviar invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
