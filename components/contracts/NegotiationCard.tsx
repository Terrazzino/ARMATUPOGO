"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createOffer, acceptOffer, rejectOffer, cancelContract } from "@/app/actions/contracts";

export interface NegotiationCardProps {
  contract: {
    id: string;
    estado: string;
    montoPactado?: number | null;
    fechaAcuerdo?: Date | string | null;
    motivoCancelacion?: string | null;
    evento: {
      id: string;
      titulo: string;
      startsAt: Date | string;
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
      monto: number;
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
  const isFinalState = ["ACORDADO", "CANCELADO", "COMPLETADO"].includes(contract.estado);

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
    <article className="atp-card space-y-4 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Fecha: {new Date(contract.evento.startsAt).toLocaleDateString("es-AR")}
          </span>
          <h4 className="atp-heading mt-1 text-xl">
            {contract.evento.titulo}
          </h4>
          <p className="text-xs text-neutral-400">
            Banda: <strong className="text-neutral-200">{contract.proyectoMusical.nombre}</strong> ({contract.proyectoMusical.genero}) • Organizador: {contract.organizador.nombre} {contract.organizador.apellido}
          </p>
        </div>
        <div>
          <StatusBadge status={contract.estado} />
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.error ? "alert" : "status"}
          className={`atp-feedback text-sm ${
            feedback.error
              ? "atp-feedback-error"
              : "atp-feedback-success"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Agreed amount badge if agreed */}
      {contract.estado === "ACORDADO" && (
        <div className="flex items-center justify-between border border-emerald-800 bg-emerald-950/40 p-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Monto Definitivo Pactado</span>
            <p className="text-2xl font-bold text-emerald-200">
              ${contract.montoPactado ? Number(contract.montoPactado.toString()).toLocaleString("es-AR") : "0"}
            </p>
          </div>
          <span className="text-2xl" aria-hidden="true">🤝</span>
        </div>
      )}

      {/* Cancellation note if cancelled */}
      {contract.estado === "CANCELADO" && (
        <div className="atp-feedback atp-feedback-error text-sm">
          <strong>Motivo de cancelación:</strong> {contract.motivoCancelacion || "No especificado"}
        </div>
      )}

      {/* Latest Offer Details */}
      {latestOffer && contract.estado !== "ACORDADO" && contract.estado !== "CANCELADO" && (
        <div className="space-y-2 border border-neutral-700 bg-neutral-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="atp-label text-neutral-400">
              {isSender ? "Tu última propuesta" : "Propuesta económica recibida"}
            </span>
            <StatusBadge status={latestOffer.estado} />
          </div>

          <p className="text-2xl font-bold text-white">
            ${Number(latestOffer.monto.toString()).toLocaleString("es-AR")}
          </p>

          {latestOffer.mensaje && (
            <p className="text-sm italic leading-relaxed text-neutral-400">
              &ldquo;{latestOffer.mensaje}&rdquo;
            </p>
          )}

          {/* Action buttons if received offer */}
          {canActOnOffer && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-700">
              <button
                type="button"
                onClick={() => handleAccept(latestOffer.id)}
                disabled={isLoading}
                className="atp-button atp-button-primary text-xs"
              >
                ✓ Aceptar Oferta y Cerrar Acuerdo
              </button>
              <button
                type="button"
                onClick={() => setIsExpanding(!isExpanding)}
                className="atp-button atp-button-secondary text-xs"
              >
                ⇄ Enviar Contraoferta
              </button>
              <button
                type="button"
                onClick={() => handleReject(latestOffer.id)}
                disabled={isLoading}
                className="atp-button atp-button-ghost text-xs"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {!latestOffer && contract.estado === "NEGOCIANDO" && (
        <div className="atp-feedback flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
          <span>Postulación inicial sin propuesta económica enviada aún.</span>
          <button
            type="button"
            onClick={() => setIsExpanding(!isExpanding)}
            className="atp-button atp-button-secondary shrink-0 text-xs"
          >
            Iniciar Negociación
          </button>
        </div>
      )}

      {/* Counter-offer Form accordion */}
      {isExpanding && !isFinalState && (
        <form onSubmit={handleCounterOffer} className="space-y-3 border border-neutral-700 bg-neutral-800 p-4">
          <h5 className="atp-heading text-lg">
            Enviar Contraoferta
          </h5>

          <div>
            <label htmlFor={`counter-amount-${contract.id}`} className="atp-label mb-2 block">
              Nuevo monto propuesto ($) *
            </label>
            <input
              type="number"
              id={`counter-amount-${contract.id}`}
              placeholder="Ej: 75000"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              disabled={isLoading}
              min="0"
              className="atp-field"
            />
          </div>

          <div>
            <label htmlFor={`counter-message-${contract.id}`} className="atp-label mb-2 block">
              Mensaje o justificación (Opcional)
            </label>
            <textarea
              placeholder="Explicación de la contrapropuesta..."
              id={`counter-message-${contract.id}`}
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              disabled={isLoading}
              rows={2}
              className="atp-field"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-700 pt-3">
            <button
              type="button"
              onClick={() => setIsExpanding(false)}
              className="atp-button atp-button-ghost text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="atp-button atp-button-primary text-xs"
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
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="atp-button atp-button-ghost text-xs text-red-400 hover:text-red-300"
          >
            Cancelar Contratación
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="atp-modal-backdrop">
          <div
            className="atp-modal space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-contract-title-${contract.id}`}
          >
            <h4 id={`cancel-contract-title-${contract.id}`} className="atp-heading text-2xl">
              ¿Seguro que deseas cancelar esta contratación?
            </h4>
            <p className="text-sm text-neutral-400">
              Esta acción dará de baja la negociación y no podrá reactivarse.
            </p>

            <form onSubmit={handleCancelContract} className="space-y-3">
              <div>
                <label htmlFor={`cancel-reason-${contract.id}`} className="atp-label mb-2 block">
                  Motivo de cancelación *
                </label>
                <textarea
                  id={`cancel-reason-${contract.id}`}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explica el motivo..."
                  rows={3}
                  className="atp-field"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="atp-button atp-button-ghost text-xs"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="atp-button atp-button-danger text-xs"
                >
                  {isLoading ? "Cancelando..." : "Confirmar Cancelación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
