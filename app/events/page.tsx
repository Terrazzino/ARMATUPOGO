import {
  getPaginatedMusicianEvents,
  getPaginatedPublicEvents,
} from "@/app/actions/events";
import { EventCard } from "@/components/events/EventCard";
import Link from "next/link";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { MusicianEventCard } from "@/components/events/MusicianEventCard";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

interface EventsPageProps {
  searchParams: Promise<{
    search?: string | string[];
    city?: string | string[];
    page?: string | string[];
  }>;
}

export const metadata = {
  title: "Cartelera de Recitales - Arma tu pogo",
  description: "Descubre los próximos recitales y fechas de bandas en vivo.",
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function getPageItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const validPages = [...pages].filter((page) => page > 0 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  validPages.forEach((page, index) => {
    if (index > 0 && page - validPages[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function getPageHref(page: number, filters: { search?: string; city?: string }) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.city) query.set("city", filters.city);
  if (page > 1) query.set("page", String(page));
  return query.size > 0 ? `/events?${query.toString()}` : "/events";
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const filters = {
    search: firstParam(params.search),
    city: firstParam(params.city),
    page: parsePage(firstParam(params.page)),
  };
  const isMusician = user?.rol === "MUSICO";
  const musicianBoard = isMusician ? await getPaginatedMusicianEvents(filters) : null;
  const publicBoard = musicianBoard ? null : await getPaginatedPublicEvents(filters);
  const currentPage = musicianBoard?.currentPage ?? publicBoard?.currentPage ?? 1;
  const totalPages = musicianBoard?.totalPages ?? publicBoard?.totalPages ?? 0;
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="atp-page home-typography flex min-h-screen flex-col">
      <Navbar
        variant={isMusician ? "dashboard" : "public"}
        activeItem={isMusician ? "discovery" : null}
      />

      <main id="cartelera" className="home-events-board flex-1 scroll-mt-16">
        <div className="atp-container py-8 sm:py-10">
          <header className="mb-8 border-b border-neutral-700 pb-5">
            <p className="atp-kicker">
              {isMusician ? "Oportunidades para músicos" : "Próximos recitales"}
            </p>
            <h1 className="atp-heading atp-page-title mt-2">Cartelera de recitales</h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-400">
              {isMusician
                ? "Encontrá fechas disponibles y postulá uno de tus proyectos musicales."
                : "Explorá próximas fechas, lugares y propuestas de la escena independiente."}
            </p>
          </header>

          <form
            method="GET"
            aria-label="Buscar recitales"
            className="atp-panel mb-8 grid gap-3 p-4 sm:grid-cols-[1fr_0.55fr_auto]"
          >
            <label className="sr-only" htmlFor="events-search">Banda, evento o lugar</label>
            <input
              id="events-search"
              type="search"
              name="search"
              defaultValue={filters.search || ""}
              placeholder="Banda, evento o lugar"
              className="atp-field"
            />
            <label className="sr-only" htmlFor="events-city">Ciudad</label>
            <input
              id="events-city"
              type="search"
              name="city"
              defaultValue={filters.city || ""}
              placeholder="Ciudad"
              className="atp-field"
            />
            <button type="submit" className="atp-button atp-button-primary uppercase tracking-wider">
              Buscar fechas
            </button>
          </form>

          {musicianBoard && musicianBoard.projects.length === 0 && (
            <div className="atp-feedback mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Necesitás registrar y mantener activo al menos un proyecto musical antes de postularte.
              </p>
              <Link href="/dashboard/musician" className="atp-button atp-button-secondary shrink-0 text-sm">
                Ir a mis proyectos
              </Link>
            </div>
          )}

          {musicianBoard ? (
            musicianBoard.events.length === 0 ? (
              <EmptyBoard hasFilters={Boolean(filters.search || filters.city)} />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(3,minmax(0,21.5rem))]">
                {musicianBoard.events.map((event, index) => (
                  <MusicianEventCard
                    key={event.id}
                    event={event}
                    projects={musicianBoard.projects}
                    prioritizeImage={index === 0}
                  />
                ))}
              </div>
            )
          ) : publicBoard && publicBoard.events.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(3,minmax(0,21.5rem))]">
              {publicBoard.events.map((event, index) => (
                <EventCard key={event.id} event={event} prioritizeImage={index === 0} />
              ))}
            </div>
          ) : (
            <EmptyBoard hasFilters={Boolean(filters.search || filters.city)} />
          )}

          {totalPages > 1 && (
            <nav aria-label="Páginas de la cartelera" className="mt-10 flex items-center justify-center gap-2">
              <PageLink page={currentPage - 1} label="Ir a la página anterior" disabled={currentPage <= 1} filters={filters}>←</PageLink>
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} aria-hidden="true" className="grid h-9 min-w-7 place-items-center text-neutral-500">…</span>
                ) : (
                  <Link
                    key={item}
                    href={getPageHref(item, filters)}
                    aria-label={`Ir a la página ${item}`}
                    aria-current={item === currentPage ? "page" : undefined}
                    className={`grid h-9 min-w-9 place-items-center border px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                      item === currentPage
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-neutral-700 bg-black/70 text-neutral-300 hover:border-red-500 hover:text-white"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
              <PageLink page={currentPage + 1} label="Ir a la página siguiente" disabled={currentPage >= totalPages} filters={filters}>→</PageLink>
            </nav>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EmptyBoard({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="atp-empty-state mx-auto max-w-lg">
      <h2 className="atp-heading text-2xl">No encontramos fechas</h2>
      <p className="mt-2 text-sm text-neutral-400">Probá con otra banda, evento, lugar o ciudad.</p>
      {hasFilters && (
        <Link href="/events" className="atp-button atp-button-ghost mt-4 text-sm">
          Limpiar búsqueda
        </Link>
      )}
    </div>
  );
}

function PageLink({
  page,
  label,
  disabled,
  filters,
  children,
}: {
  page: number;
  label: string;
  disabled: boolean;
  filters: { search?: string; city?: string };
  children: React.ReactNode;
}) {
  const className = "grid h-9 min-w-9 place-items-center border px-2 text-sm font-bold";
  return disabled ? (
    <span aria-disabled="true" aria-label={label} className={`${className} cursor-not-allowed border-neutral-800 bg-black/40 text-neutral-600`}>
      {children}
    </span>
  ) : (
    <Link
      href={getPageHref(page, filters)}
      aria-label={label}
      className={`${className} border-neutral-700 bg-black/70 text-neutral-200 transition-colors hover:border-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500`}
    >
      {children}
    </Link>
  );
}
