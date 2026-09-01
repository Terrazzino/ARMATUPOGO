"use client";

import { useState } from "react";
import { inviteProject } from "@/app/actions/contracts";

interface InviteModalProps {
  projectId: string;
  projectName: string;
  events: Array<{
    id: string;
    titulo: string;
    fechaEvento: Date | string;
  }>;
}

export function InviteModal({ projectId, projectName, events }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

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
        setIsOpen(false);
      }, 2000);
    }
  }

  if (events.length === 0) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-200 text-sm">
        <p className="font-semibold">¿Quieres contratar a {projectName}?</p>
        <p className="mt-1">
          Primero debes publicar un evento activo desde tu panel de organizador.
        </p>
        <a
          href="/dashboard/organizer"
          className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors"
        >
          Publicar un Evento
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
      >
        <span>✉️</span>
        <span>Invitar a mi Evento</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invitar a {projectName}</h3>
                <p className="text-xs text-slate-500">Selecciona el recital al que deseas invitar a esta banda</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-sm mb-4 border ${
                  feedback.error
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                    : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Selecciona tu Evento
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.titulo} ({new Date(ev.fechaEvento).toLocaleDateString("es-AR")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Propuesta inicial de Caché ($) (Opcional)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 60000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Mensaje o condiciones de la propuesta
                </label>
                <textarea
                  placeholder="Hola! Nos gustaría contar con tu proyecto para esta fecha..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isLoading ? "Enviando..." : "Enviar Invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}