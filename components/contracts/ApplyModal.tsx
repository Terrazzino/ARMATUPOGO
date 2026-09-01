"use client";

import { useState } from "react";
import { applyToEvent } from "@/app/actions/contracts";

interface ApplyModalProps {
  eventId: string;
  eventTitle: string;
  projects: Array<{
    id: string;
    nombre: string;
    genero: string;
  }>;
}

export function ApplyModal({ eventId, eventTitle, projects }: ApplyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) {
      setFeedback({ error: true, message: "Debes seleccionar un proyecto musical" });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const amountNum = offerAmount ? parseFloat(offerAmount) : undefined;
    const result = await applyToEvent(eventId, selectedProjectId, amountNum, message);

    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "¡Postulación enviada con éxito! Puedes seguir la negociación desde tu panel." });
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
        <p className="font-semibold">¿Quieres tocar en este evento?</p>
        <p className="mt-1">
          Primero debes registrar un proyecto musical desde tu panel de músico.
        </p>
        <a
          href="/dashboard/musician"
          className="inline-block mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
        >
          Crear Proyecto Musical
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
      >
        <span>🎸</span>
        <span>Postular mi Banda</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Postular a Recital</h3>
                <p className="text-xs text-slate-500">{eventTitle}</p>
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

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Selecciona tu Proyecto Musical
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.genero})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Propuesta económica / Caché pretendido ($) (Opcional)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 50000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Mensaje para el Organizador (Opcional)
                </label>
                <textarea
                  placeholder="Comenta sobre tu propuesta, disponibilidad técnica o requerimientos..."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isLoading ? "Enviando..." : "Enviar Postulación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}