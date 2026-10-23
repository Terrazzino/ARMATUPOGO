"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptPostulation, rejectPostulation } from "@/app/actions/contracts";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface PostulationCardProps {
  postulation: {
    id: string;
    estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "CANCELADA";
    mensaje: string | null;
    creadoEn: Date;
    evento: { id: string; titulo: string };
    proyectoMusical: { id: string; nombre: string };
    musico: { nombre: string; apellido: string };
    contratacion: { id: string } | null;
  };
}

export function PostulationCard({ postulation }: PostulationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);

  function processPostulation(action: "accept" | "reject") {
    setFeedback(null);
    startTransition(async () => {
      const result = action === "accept"
        ? await acceptPostulation(postulation.id)
        : await rejectPostulation(postulation.id);

      if (result.error) {
        setFeedback({ error: true, message: result.message });
        return;
      }

      setFeedback({
        error: false,
        message: action === "accept"
          ? "Postulación aceptada. La negociación ya está disponible."
          : "Postulación rechazada.",
      });
    });
  }

  return (
    <article className="atp-card space-y-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="atp-kicker">
            {postulation.evento.titulo}
          </p>
          <h3 className="atp-heading mt-1 text-xl">
            {postulation.proyectoMusical.nombre}
          </h3>
          <p className="text-sm text-neutral-400">
            {postulation.musico.nombre} {postulation.musico.apellido}
          </p>
        </div>
        <StatusBadge status={postulation.estado} />
      </div>

      {postulation.mensaje && (
        <p className="whitespace-pre-line border border-neutral-800 bg-neutral-950 p-3 text-sm leading-relaxed text-neutral-300">
          {postulation.mensaje}
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={`atp-feedback text-sm ${
            feedback.error
              ? "atp-feedback-error"
              : "atp-feedback-success"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-3">
        <span className="text-xs text-neutral-500">
          Recibida el {new Date(postulation.creadoEn).toLocaleDateString("es-AR")}
        </span>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${postulation.proyectoMusical.id}`}
            className="atp-button atp-button-ghost text-xs"
          >
            Ver proyecto
          </Link>

          {postulation.estado === "PENDIENTE" && (
            <>
              <button
                type="button"
                onClick={() => processPostulation("reject")}
                disabled={isPending}
                className="atp-button atp-button-secondary text-xs"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => processPostulation("accept")}
                disabled={isPending}
                aria-busy={isPending}
                className="atp-button atp-button-primary text-xs"
              >
                {isPending ? "Procesando..." : "Aceptar e iniciar negociación"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
