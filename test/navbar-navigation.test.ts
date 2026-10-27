import { describe, expect, it } from "vitest";
import { resolveDashboardNavItem } from "@/lib/navbar-navigation";

describe("navegación activa del dashboard", () => {
  it.each([
    ["/dashboard/musician", "MUSICO", "profile"],
    ["/dashboard/musician/settings", "MUSICO", "profile"],
    ["/events", "MUSICO", "discovery"],
    ["/events/event-id", "MUSICO", "discovery"],
    ["/dashboard/organizer", "ORGANIZADOR", "profile"],
    ["/dashboard/organizer/settings", "ORGANIZADOR", "profile"],
    ["/projects", "ORGANIZADOR", "discovery"],
    ["/projects/project-id", "ORGANIZADOR", "discovery"],
  ] as const)("resuelve %s para %s como %s", (pathname, role, expected) => {
    expect(resolveDashboardNavItem(pathname, role)).toBe(expected);
  });

  it.each([
    ["/projects", "MUSICO"],
    ["/projects/project-id", "MUSICO"],
    ["/events", "ORGANIZADOR"],
    ["/events/event-id", "ORGANIZADOR"],
    ["/dashboard/musician-tools", "MUSICO"],
    ["/events-archive", "MUSICO"],
    ["/projects-old", "ORGANIZADOR"],
  ] as const)("no produce falsos positivos para %s y %s", (pathname, role) => {
    expect(resolveDashboardNavItem(pathname, role)).toBeNull();
  });
});
