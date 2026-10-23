"use client";

import dynamic from "next/dynamic";
import type { NegotiationCardProps } from "@/components/contracts/NegotiationCard";

const NegotiationCard = dynamic(
  () => import("@/components/contracts/NegotiationCard").then((module) => module.NegotiationCard),
  {
    loading: () => (
      <p role="status" className="atp-feedback text-sm text-neutral-400">
        Cargando negociación...
      </p>
    ),
  }
);

export function DeferredNegotiationCard(props: NegotiationCardProps) {
  return <NegotiationCard {...props} />;
}
