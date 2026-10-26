import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("límites de carga diferida", () => {
  it.each([
    ["components/projects/DeferredCreateProjectModal.tsx", "CreateProjectModal"],
    ["components/projects/DeferredEditProjectModal.tsx", "EditProjectModal"],
    ["components/events/DeferredCreateEventModal.tsx", "CreateEventModal"],
    ["components/events/DeferredEditEventModal.tsx", "EditEventModal"],
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

  it("la cancelación de proyecto restaura formulario, imagen y foco sin guardar", () => {
    const contents = source("components/projects/CreateProjectModal.tsx");

    expect(contents).toContain("reset(defaults)");
    expect(contents).toContain("setSelectedImage(null)");
    expect(contents).toContain("setRemoveImage(false)");
    expect(contents).toContain("document.getElementById(triggerId)?.focus()");
  });

  it("el formulario de eventos alinea recinto, dirección y ciudad y restaura el borrador al cancelar", () => {
    const contents = source("components/events/CreateEventModal.tsx");

    expect(contents.match(/grid-rows-\[2\.75rem_auto_auto\]/g)).toHaveLength(3);
    expect(contents).toContain("sm:grid-cols-3 sm:items-start");
    expect(contents).toContain("reset(defaults)");
    expect(contents).toContain("setSelectedImage(null)");
    expect(contents).toContain("setRemoveImage(false)");
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
