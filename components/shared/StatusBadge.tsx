import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let label = status;
  let colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300";

  switch (status) {
    // Eventos
    case "BORRADOR":
      label = "Borrador";
      colorClass = "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      break;
    case "PUBLICADO":
      label = "Publicado";
      colorClass = "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      break;
    case "EN_CURSO":
      label = "En curso";
      colorClass = "bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      break;
    case "COMPLETADO":
      label = "Finalizado";
      colorClass = "bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      break;
    case "CANCELADO":
      label = "Cancelado";
      colorClass = "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800";
      break;

    // Contrataciones
    case "PENDIENTE":
      label = "Postulación Pendiente";
      colorClass = "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      break;
    case "NEGOCIANDO":
      label = "En Negociación";
      colorClass = "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      break;
    case "ACORDADO":
      label = "Acuerdo Confirmado";
      colorClass = "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-green-300 dark:border-green-800 font-semibold";
      break;
    case "RECHAZADO":
      label = "Rechazado";
      colorClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300";
      break;

    // Ofertas
    case "PROPUESTA":
      label = "Oferta Vigente";
      colorClass = "bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200";
      break;
    case "ACEPTADA":
      label = "Aceptada";
      colorClass = "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-green-200";
      break;
    case "CONTRAOFERTADA":
      label = "Contraofertada";
      colorClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300";
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