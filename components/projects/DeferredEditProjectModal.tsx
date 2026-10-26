"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EditableProject } from "@/lib/project-form-values";

const EditProjectModal = dynamic(
  () => import("@/components/projects/CreateProjectModal").then((module) => module.EditProjectModal),
  { loading: () => <button type="button" disabled aria-busy="true" className="atp-button atp-button-secondary text-sm">Cargando formulario...</button> }
);

export function DeferredEditProjectModal({ project }: { project: EditableProject }) {
  const [activated, setActivated] = useState(false);
  if (activated) return <EditProjectModal project={project} initiallyOpen />;
  return <button type="button" onClick={() => setActivated(true)} className="atp-button atp-button-secondary text-sm">Editar proyecto</button>;
}
