"use client";

import { useState } from "react";
import { createRating } from "@/app/actions/ratings";

interface RatingModalProps {
  contractId: string;
  targetName: string;
}

export function RatingModal({ contractId, targetName }: RatingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

  async function handleRating(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const result = await createRating({
      contratacionId: contractId,
      puntaje: score,
      comentario: comment,
    });

    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "¡Valoración registrada con éxito!" });
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1"
      >
        <span>★</span>
        <span>Calificar a {targetName}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Valorar a {targetName}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  feedback.error
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50"
                    : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleRating} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Puntaje (Estrellas)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setScore(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= score ? "text-amber-400" : "text-slate-300 dark:text-slate-700"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                    {score} de 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Comentario o Reseña (Opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia trabajando juntos en la fecha..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold text-xs rounded-lg transition-colors"
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