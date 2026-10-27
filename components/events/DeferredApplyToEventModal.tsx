"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ApplyToEventModalProps } from "@/components/events/ApplyToEventModal";

const ApplyToEventModal = dynamic(
  () => import("@/components/events/ApplyToEventModal").then((module) => module.ApplyToEventModal),
  {
    loading: () => (
      <button
        type="button"
        disabled
        aria-busy="true"
        className="atp-button atp-button-primary w-full px-3 text-xs uppercase tracking-[0.08em]"
      >
        Cargando formulario...
      </button>
    ),
  }
);

export function DeferredApplyToEventModal(props: ApplyToEventModalProps) {
  const [activated, setActivated] = useState(false);
  const availableProjects = props.projects.filter((project) => project.state === "DISPONIBLE");
  const unavailableReason = props.disabledReason
    ?? (props.projects.length === 0
      ? "Necesitás registrar un proyecto musical activo antes de postularte."
      : availableProjects.length === 0
        ? "Todos tus proyectos activos ya tienen una relación con este evento."
        : undefined);

  if (activated) return <ApplyToEventModal {...props} initiallyOpen />;

  return (
    <>
      <button
        type="button"
        onClick={() => setActivated(true)}
        disabled={Boolean(unavailableReason)}
        className="atp-button atp-button-primary w-full px-3 text-xs uppercase tracking-[0.08em]"
      >
        Postular mi banda
      </button>
      {unavailableReason && (
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">{unavailableReason}</p>
      )}
    </>
  );
}
