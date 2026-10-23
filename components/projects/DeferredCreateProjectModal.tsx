"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const CreateProjectModal = dynamic(
  () => import("@/components/projects/CreateProjectModal").then((module) => module.CreateProjectModal),
  {
    loading: () => (
      <button type="button" disabled aria-busy="true" className="atp-button atp-button-primary text-sm">
        <span aria-hidden="true">+</span>
        <span>Cargando formulario...</span>
      </button>
    ),
  }
);

export function DeferredCreateProjectModal() {
  const [activated, setActivated] = useState(false);

  if (activated) return <CreateProjectModal initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="atp-button atp-button-primary text-sm"
    >
      <span aria-hidden="true">+</span>
      <span>Crear Proyecto Musical</span>
    </button>
  );
}
