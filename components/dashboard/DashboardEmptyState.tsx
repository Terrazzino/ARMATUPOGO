import type { ReactNode } from "react";

interface DashboardEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
}: DashboardEmptyStateProps) {
  return (
    <div className="atp-empty-state mx-auto max-w-lg">
      <span className="mb-3 block text-3xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="atp-heading text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
