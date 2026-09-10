import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let label = status;
  let colorClass = "bg-neutral-800 text-neutral-300 border-neutral-700";

  switch (status) {
    case "PUBLICADO":
      label = "Publicado";
      colorClass = "bg-emerald-950/50 text-emerald-300 border-emerald-800";
      break;
    case "CANCELADO":
      label = "Cancelado";
      colorClass = "bg-red-950/50 text-red-300 border-red-800";
      break;
    case "PENDIENTE":
      label = "Postulación Pendiente";
      colorClass = "bg-amber-950/50 text-amber-300 border-amber-800";
      break;
    case "NEGOCIANDO":
      label = "En Negociación";
      colorClass = "bg-neutral-800 text-neutral-200 border-neutral-700";
      break;
    case "ACORDADO":
      label = "Acuerdo Confirmado";
      colorClass = "bg-emerald-950/50 text-emerald-300 border-emerald-800 font-semibold";
      break;
    case "COMPLETADO":
      label = "Finalizado";
      colorClass = "bg-emerald-950/50 text-emerald-300 border-emerald-800";
      break;
    case "PROPUESTA":
      label = "Oferta Vigente";
      colorClass = "bg-neutral-800 text-neutral-200 border-neutral-700";
      break;
    case "ACEPTADA":
      label = "Aceptada";
      colorClass = "bg-emerald-950/50 text-emerald-300 border-emerald-800";
      break;
    case "CONTRAOFERTADA":
      label = "Contraofertada";
      colorClass = "bg-neutral-800 text-neutral-400 border-neutral-700";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
}