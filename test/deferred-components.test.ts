import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("límites de carga diferida", () => {
  it.each([
    ["components/projects/DeferredCreateProjectModal.tsx", "CreateProjectModal"],
    ["components/events/DeferredCreateEventModal.tsx", "CreateEventModal"],
    ["components/events/DeferredApplyToEventModal.tsx", "ApplyToEventModal"],
    ["components/contracts/DeferredInviteModal.tsx", "InviteModal"],
    ["components/ratings/DeferredRatingModal.tsx", "RatingModal"],
    ["components/contracts/DeferredNegotiationCard.tsx", "NegotiationCard"],
  ])("mantiene %s como importación dinámica de %s", (path, component) => {
    const contents = source(path);

    expect(contents).toContain('from "next/dynamic"');
    expect(contents).toContain(`import("@/components/`);
    expect(contents).toContain(`module.${component}`);
    expect(contents).toContain("loading:");
  });

  it("no vuelve a incluir los formularios de creación en los dashboards iniciales", () => {
    const musicianDashboard = source("app/dashboard/musician/page.tsx");
    const organizerDashboard = source("app/dashboard/organizer/page.tsx");

    expect(musicianDashboard).toContain("DeferredCreateProjectModal");
    expect(musicianDashboard).not.toContain('from "@/components/projects/CreateProjectModal"');
    expect(organizerDashboard).toContain("DeferredCreateEventModal");
    expect(organizerDashboard).not.toContain('from "@/components/events/CreateEventModal"');
  });

  it.each([
    "components/projects/CreateProjectModal.tsx",
    "components/events/CreateEventModal.tsx",
    "components/events/ApplyToEventModal.tsx",
    "components/contracts/InviteModal.tsx",
    "components/ratings/RatingModal.tsx",
  ])("abre %s al montarse desde su disparador diferido", (path) => {
    const contents = source(path);

    expect(contents).toContain("initiallyOpen = false");
    expect(contents).toContain("useState(initiallyOpen)");
  });
});
