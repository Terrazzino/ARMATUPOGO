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
          ? "flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-end sm:justify-between"
          : "atp-panel flex flex-col gap-4 border-l-4 border-l-red-600 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      }
    >
      <div className="min-w-0">
        <p className="atp-kicker">{roleLabel}</p>
        <h1 className="atp-heading mt-1 text-3xl sm:text-[2.15rem]">
          Hola, {name}
        </h1>
        <p className="mt-2 break-words text-sm text-neutral-400">
          {email} <span aria-hidden="true">•</span> {resourceSummary}
        </p>
      </div>

      <div
        className={
          isPlain
            ? "flex shrink-0 items-center gap-3 border-l-2 border-red-600 pl-4 sm:min-w-52"
            : "atp-card flex shrink-0 items-center gap-3 p-3.5 sm:min-w-52"
        }
      >
        <div>
          <span className="atp-label block text-neutral-400">Reputación</span>
          <RockHandScore
            score={reputationTotal > 0 ? reputationScore : null}
            iconSize={26}
            className="mt-1 text-xl font-bold text-neutral-100"
          />
        </div>
        <div className="border-l border-neutral-700 pl-4 text-sm text-neutral-400">
          {reputationTotal} {reputationTotal === 1 ? "valoración" : "valoraciones"}
        </div>
      </div>
    </header>
  );
}
