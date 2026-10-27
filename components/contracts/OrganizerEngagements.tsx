"use client";

import { useState } from "react";
import { OrganizerContractRow } from "@/components/contracts/OrganizerContractsList";
import { OrganizerPostulationRow } from "@/components/contracts/OrganizerPostulationsList";
import type {
  OrganizerEngagementGroups,
} from "@/lib/organizer-engagements";

type EngagementTab = keyof OrganizerEngagementGroups;

interface OrganizerEngagementsProps {
  groups: OrganizerEngagementGroups;
  currentUserId: string;
  now: string;
}

const tabs: Array<{ id: EngagementTab; label: string }> = [
  { id: "review", label: "Por revisar" },
  { id: "negotiating", label: "En negociación" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "finished", label: "Finalizadas" },
  { id: "history", label: "Historial" },
];

const emptyMessages: Record<EngagementTab, string> = {
  review: "No hay postulaciones por revisar",
  negotiating: "No hay negociaciones activas",
  confirmed: "No hay contrataciones confirmadas vigentes",
  finished: "No hay contrataciones finalizadas",
  history: "No hay postulaciones ni contrataciones descartadas",
};

export function OrganizerEngagements({
  groups,
  currentUserId,
  now,
}: OrganizerEngagementsProps) {
  const [activeTab, setActiveTab] = useState<EngagementTab>("review");
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const entries = groups[activeTab];

  return (
    <div>
      <dl className="mb-4 grid grid-cols-3 border border-neutral-800 bg-neutral-950">
        {[
          ["Por revisar", groups.review.length],
          ["Negociaciones", groups.negotiating.length],
          ["Confirmadas", groups.confirmed.length],
        ].map(([label, value], index) => (
          <div key={label} className={`px-3 py-2.5 text-center ${index > 0 ? "border-l border-neutral-800" : ""}`}>
            <dt className="atp-label text-[0.65rem] text-neutral-500 sm:text-xs">{label}</dt>
            <dd className="atp-heading mt-1 text-2xl text-neutral-100">{value}</dd>
          </div>
        ))}
      </dl>

      <div role="tablist" aria-label="Filtrar postulaciones y contrataciones" className="mb-4 grid grid-cols-2 border-b border-neutral-800 sm:grid-cols-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`organizer-engagements-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="organizer-engagements-panel"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 min-w-0 border-b-2 px-2 text-xs font-bold uppercase tracking-[0.07em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              activeTab === tab.id
                ? "border-red-600 text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {tab.label} <span aria-label={`${groups[tab.id].length} registros`}>({groups[tab.id].length})</span>
          </button>
        ))}
      </div>

      <div
        id="organizer-engagements-panel"
        role="tabpanel"
        aria-labelledby={`organizer-engagements-${activeTab}-tab`}
      >
        {entries.length === 0 ? (
          <div className="atp-empty-state py-9">
            <h3 className="atp-heading text-xl">{emptyMessages[activeTab]}</h3>
          </div>
        ) : (
          <div role="table" aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label}: postulaciones y contrataciones`} className="divide-y divide-neutral-800 overflow-hidden border border-neutral-800 bg-neutral-950">
            {entries.map((entry) => entry.kind === "postulation" ? (
              <OrganizerPostulationRow
                key={`postulation-${entry.item.id}`}
                postulation={entry.item}
                compact
                allowResolution={activeTab === "review"}
                onResolved={(action) => setActiveTab(action === "accept" ? "negotiating" : "history")}
              />
            ) : (
              <OrganizerContractRow
                key={`contract-${entry.item.id}`}
                contract={entry.item}
                currentUserId={currentUserId}
                now={now}
                compact
                actionsDisabled={activeTab === "history"}
                negotiationExpanded={expandedContractId === entry.item.id}
                onToggleNegotiation={() => setExpandedContractId((current) =>
                  current === entry.item.id ? null : entry.item.id
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
