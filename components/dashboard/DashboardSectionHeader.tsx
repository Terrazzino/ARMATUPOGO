import type { ReactNode } from "react";

interface DashboardSectionHeaderProps {
  headingId: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function DashboardSectionHeader({
  headingId,
  title,
  description,
  action,
}: DashboardSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-neutral-800 pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={headingId} className="atp-heading text-2xl sm:text-[1.7rem]">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
