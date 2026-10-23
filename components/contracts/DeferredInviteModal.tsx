"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { InviteModalProps } from "@/components/contracts/InviteModal";

const InviteModal = dynamic(
  () => import("@/components/contracts/InviteModal").then((module) => module.InviteModal),
  {
    loading: () => (
      <button
        type="button"
        disabled
        aria-busy="true"
        className="atp-button atp-button-primary min-h-10 w-full px-4 text-sm uppercase tracking-[0.08em] sm:w-auto"
      >
        Cargando invitación...
      </button>
    ),
  }
);

export function DeferredInviteModal(props: InviteModalProps) {
  const [activated, setActivated] = useState(false);

  if (props.events.length === 0) {
    return (
      <div className="border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
        <p className="font-bold text-neutral-200">¿Querés contratar a {props.projectName}?</p>
        <p className="mt-1 max-w-xl">
          Primero debes publicar un evento activo desde tu panel de organizador.
        </p>
        <a
          href="/dashboard/organizer"
          className="atp-button atp-button-secondary mt-4 min-h-10 px-4 text-sm"
        >
          Publicar un evento
        </a>
      </div>
    );
  }

  if (activated) return <InviteModal {...props} initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="atp-button atp-button-primary min-h-10 w-full px-4 text-sm uppercase tracking-[0.08em] sm:w-auto"
    >
      <span>Invitar a mi evento</span>
    </button>
  );
}
