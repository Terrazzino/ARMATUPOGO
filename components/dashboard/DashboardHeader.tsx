import { RockHandScore } from "@/components/ratings/RockHandRating";

interface DashboardHeaderProps {
  roleLabel: string;
  name: string;
  email: string;
  resourceSummary: string;
  reputationScore: number;
  reputationTotal: number;
  variant?: "panel" | "plain";
}

export function DashboardHeader({
  roleLabel,
  name,
  email,
  resourceSummary,
  reputationScore,
  reputationTotal,
  variant = "panel",
}: DashboardHeaderProps) {
  const isPlain = variant === "plain";

  return (
    <header
      className={
        isPlain
          ? "flex flex-col gap-5 border-b border-neutral-800 pb-6 sm:flex-row sm:items-end sm:justify-between"
          : "atp-panel flex flex-col gap-5 border-l-4 border-l-red-600 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      }
    >
      <div className="min-w-0">
        <p className="atp-kicker">{roleLabel}</p>
        <h1 className="atp-heading mt-1 text-3xl sm:text-4xl">
          Hola, {name}
        </h1>
        <p className="mt-2 break-words text-sm text-neutral-400">
          {email} <span aria-hidden="true">•</span> {resourceSummary}
        </p>
      </div>

      <div
        className={
          isPlain
            ? "flex shrink-0 items-center gap-4 border-l-2 border-red-600 pl-4 sm:min-w-56"
            : "atp-card flex shrink-0 items-center gap-4 p-4 sm:min-w-56"
        }
      >
        <div>
          <span className="atp-label block text-neutral-400">Reputación</span>
          <RockHandScore
            score={reputationTotal > 0 ? reputationScore : null}
            iconSize={30}
            className="mt-1 text-2xl font-bold text-neutral-100"
          />
        </div>
        <div className="border-l border-neutral-700 pl-4 text-sm text-neutral-400">
          {reputationTotal} {reputationTotal === 1 ? "valoración" : "valoraciones"}
        </div>
      </div>
    </header>
  );
}
