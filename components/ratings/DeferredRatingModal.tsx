"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { RockHandIcon } from "@/components/ratings/RockHandRating";
import type { RatingModalProps } from "@/components/ratings/RatingModal";

const RatingModal = dynamic(
  () => import("@/components/ratings/RatingModal").then((module) => module.RatingModal),
  {
    loading: () => (
      <button type="button" disabled aria-busy="true" className="atp-button atp-button-secondary text-xs">
        <RockHandIcon size={18} />
        <span>Cargando valoración...</span>
      </button>
    ),
  }
);

export function DeferredRatingModal(props: RatingModalProps) {
  const [activated, setActivated] = useState(false);

  if (activated) return <RatingModal {...props} initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="atp-button atp-button-secondary text-xs"
    >
      <RockHandIcon size={18} />
      <span>{props.triggerLabel ?? `Calificar a ${props.targetName}`}</span>
    </button>
  );
}
