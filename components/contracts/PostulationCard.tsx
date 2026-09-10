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
    <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            {postulation.evento.titulo}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            {postulation.proyectoMusical.nombre}
          </h3>
          <p className="text-sm text-neutral-400">
            {postulation.musico.nombre} {postulation.musico.apellido}
          </p>
        </div>
        <StatusBadge status={postulation.estado} />
      </div>

      {postulation.mensaje && (
        <p className="whitespace-pre-line rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
          {postulation.mensaje}
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs ${
            feedback.error
              ? "border-red-800 bg-red-950/50 text-red-300"
              : "border-emerald-800 bg-emerald-950/50 text-emerald-300"
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
            className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Ver proyecto
          </Link>

          {postulation.estado === "PENDIENTE" && (
            <>
              <button
                type="button"
                onClick={() => processPostulation("reject")}
                disabled={isPending}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => processPostulation("accept")}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
