"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const CreateEventModal = dynamic(
  () => import("@/components/events/CreateEventModal").then((module) => module.CreateEventModal),
  {
    loading: () => (
      <button type="button" disabled aria-busy="true" className="atp-button atp-button-primary text-sm">
        <span aria-hidden="true">+</span>
        <span>Cargando formulario...</span>
      </button>
    ),
  }
);

export function DeferredCreateEventModal() {
  const [activated, setActivated] = useState(false);

  if (activated) return <CreateEventModal initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="atp-button atp-button-primary text-sm"
    >
      <span aria-hidden="true">+</span>
      <span>Publicar Nuevo Evento</span>
    </button>
  );
}
