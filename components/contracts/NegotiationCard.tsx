"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createOffer, acceptOffer, rejectOffer, cancelContract } from "@/app/actions/contracts";

interface NegotiationCardProps {
  contract: {
    id: string;
    estado: string;
    montoPactado?: number | string | { toString(): string } | null;
    fechaAcuerdo?: Date | string | null;
    motivoCancelacion?: string | null;
    evento: {
      id: string;
      titulo: string;
      fechaEvento: Date | string;
      ubicacion: string;
    };
    proyectoMusical: {
      id: string;
      nombre: string;
      genero: string;
    };
    organizador: {
      nombre: string;
      apellido: string;
    };
    musico: {
      nombre: string;
      apellido: string;
    };
    ofertas?: Array<{
      id: string;
      monto: number | string | { toString(): string };
      mensaje?: string | null;
      estado: string;
      remitenteId?: string;
      creadoEn: Date | string;
    }>;
  };
  currentUserId: string;
}

export function NegotiationCard({ contract, currentUserId }: NegotiationCardProps) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: boolean; message: string } | null>(null);

  const latestOffer = contract.ofertas?.[0];
  const isSender = latestOffer?.remitenteId === currentUserId;
  const canActOnOffer = latestOffer && latestOffer.estado === "PROPUESTA" && !isSender;
  const isFinalState = ["ACORDADO", "CANCELADO", "COMPLETADO", "RECHAZADO"].includes(contract.estado);

  async function handleAccept(offerId: string) {
    setIsLoading(true);
    setFeedback(null);
    const result = await acceptOffer(offerId);
    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "¡Acuerdo cerrado exitosamente!" });
    }
  }

  async function handleReject(offerId: string) {
    setIsLoading(true);
    setFeedback(null);
    const result = await rejectOffer(offerId);
    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "Oferta rechazada" });
    }
  }

  async function handleCounterOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      setFeedback({ error: true, message: "Ingresa un monto válido" });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const result = await createOffer({
      contratacionId: contract.id,
      monto: parseFloat(counterAmount),
      mensaje: counterMessage,
    });

    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setFeedback({ error: false, message: "Contraoferta enviada" });
      setCounterAmount("");
      setCounterMessage("");
    }
  }

  async function handleCancelContract(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelReason || cancelReason.trim().length < 5) {
      setFeedback({ error: true, message: "Indica un motivo de al menos 5 caracteres" });
      return;
    }

    setIsLoading(true);
    const result = await cancelContract({
      contratacionId: contract.id,
      motivoCancelacion: cancelReason,
    });
    setIsLoading(false);

    if (result.error) {
      setFeedback({ error: true, message: result.message });
    } else {
      setShowCancelModal(false);
      setFeedback({ error: false, message: "Contratación cancelada" });
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fecha: {new Date(contract.evento.fechaEvento).toLocaleDateString("es-AR")}
          </span>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            {contract.evento.titulo}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Banda: <strong className="text-slate-900 dark:text-slate-200">{contract.proyectoMusical.nombre}</strong> ({contract.proyectoMusical.genero}) • Organizador: {contract.organizador.nombre} {contract.organizador.apellido}
          </p>
        </div>
        <div>
          <StatusBadge status={contract.estado} />
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            feedback.error
              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
              : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Agreed amount badge if agreed */}
      {contract.estado === "ACORDADO" && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Monto Definitivo Pactado</span>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-200">
              ${contract.montoPactado ? Number(contract.montoPactado.toString()).toLocaleString("es-AR") : "0"}
            </p>
          </div>
          <span className="text-2xl">🤝</span>
        </div>
      )}

      {/* Cancellation note if cancelled */}
      {contract.estado === "CANCELADO" && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
          <strong>Motivo de cancelación:</strong> {contract.motivoCancelacion || "No especificado"}
        </div>
      )}

      {/* Latest Offer Details */}
      {latestOffer && contract.estado !== "ACORDADO" && contract.estado !== "CANCELADO" && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isSender ? "Tu última propuesta" : "Propuesta económica recibida"}
            </span>
            <StatusBadge status={latestOffer.estado} />
          </div>

          <p className="text-2xl font-black text-slate-900 dark:text-white">
            ${Number(latestOffer.monto.toString()).toLocaleString("es-AR")}
          </p>

          {latestOffer.mensaje && (
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              &ldquo;{latestOffer.mensaje}&rdquo;
            </p>
          )}

          {/* Action buttons if received offer */}
          {canActOnOffer && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleAccept(latestOffer.id)}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                ✓ Aceptar Oferta y Cerrar Acuerdo
              </button>
              <button
                onClick={() => setIsExpanding(!isExpanding)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                ⇄ Enviar Contraoferta
              </button>
              <button
                onClick={() => handleReject(latestOffer.id)}
                disabled={isLoading}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg transition-colors"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {/* No initial offer yet in PENDIENTE */}
      {!latestOffer && contract.estado === "PENDIENTE" && (
        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          <span>Postulación inicial sin propuesta económica enviada aún.</span>
          <button
            onClick={() => setIsExpanding(!isExpanding)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
          >
            Iniciar Negociación
          </button>
        </div>
      )}

      {/* Counter-offer Form accordion */}
      {isExpanding && !isFinalState && (
        <form onSubmit={handleCounterOffer} className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <h5 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
            Enviar Contraoferta
          </h5>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nuevo monto propuesto ($) *
            </label>
            <input
              type="number"
              placeholder="Ej: 75000"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              disabled={isLoading}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Mensaje o justificación (Opcional)
            </label>
            <textarea
              placeholder="Explicación de la contrapropuesta..."
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              disabled={isLoading}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExpanding(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-lg transition-colors"
            >
              {isLoading ? "Enviando..." : "Enviar Propuesta"}
            </button>
          </div>
        </form>
      )}

      {/* Footer controls: Cancelation */}
      {!isFinalState && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs text-red-500 hover:text-red-700 hover:underline"
          >
            Cancelar Contratación
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              ¿Seguro que deseas cancelar esta contratación?
            </h4>
            <p className="text-xs text-slate-500">
              Esta acción dará de baja la negociación y no podrá reactivarse.
            </p>

            <form onSubmit={handleCancelContract} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo de cancelación *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explica el motivo..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg"
                >
                  {isLoading ? "Cancelando..." : "Confirmar Cancelación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}