"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EditableEvent } from "@/lib/event-form-values";

const EditEventModal = dynamic(
  () => import("@/components/events/CreateEventModal").then((module) => module.EditEventModal),
  { loading: () => <button type="button" disabled aria-busy="true" className="atp-button atp-button-secondary min-h-9 px-3 text-xs">Cargando editor...</button> }
);

export function DeferredEditEventModal({ event }: { event: EditableEvent }) {
  const [activated, setActivated] = useState(false);
  if (activated) return <EditEventModal event={event} initiallyOpen />;
  return <button type="button" onClick={() => setActivated(true)} className="atp-button atp-button-secondary min-h-9 px-3 text-xs">Editar evento</button>;
}
