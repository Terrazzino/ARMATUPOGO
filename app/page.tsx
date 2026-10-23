import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { getPaginatedPublicEvents } from "@/app/actions/events";
import { EventCard } from "@/components/events/EventCard";

interface HomeProps {
  searchParams: Promise<{
    search?: string | string[];
    city?: string | string[];
    page?: string | string[];
  }>;
}

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
  const search = query.toString();
  return `${search ? `/?${search}` : "/"}#cartelera`;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filters = {
    search: firstParam(params.search),
    city: firstParam(params.city),
  };
  const { events, totalPages, currentPage } = await getPaginatedPublicEvents({
    ...filters,
    page: parsePage(firstParam(params.page)),
  });
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="home-typography min-h-screen flex flex-col bg-slate-950 text-white">
      <Navbar />

      <main className="flex-1">
        <section className="home-hero relative overflow-hidden border-b border-neutral-800">
          <div className="home-hero-mark" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 lg:px-8 lg:pb-10 lg:pt-12">
            <div className="max-w-6xl">
              <h1 className="home-display max-w-6xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.025em] text-white sm:text-7xl lg:text-[clamp(5.5rem,7vw,6rem)] lg:whitespace-nowrap">
                ¿Cuál es tu próximo <span className="text-red-600">pogo?</span>
              </h1>
              <div className="mt-6 max-w-2xl border-l-2 border-red-600 pl-5 text-base leading-[1.55] text-neutral-200 sm:text-lg">
                <p>
                  Descubrí recitales, fechas y festivales de la escena independiente. Buscá tu
                  próxima noche en vivo, sumate al pogo y explorá eventos cerca tuyo.
                </p>
                <p className="mt-2 text-neutral-500">
                  Si sos parte de una banda u organizás fechas, registrate para publicar,
                  postularte y mover la escena.
                </p>
              </div>
            </div>

            <form
              method="GET"
              aria-label="Buscar recitales"
              className="mt-8 grid gap-3 border-y border-neutral-700 bg-neutral-950/95 p-3 sm:grid-cols-[1fr_0.55fr_auto] sm:p-4"
            >
              <label className="sr-only" htmlFor="home-search">Evento, banda o lugar</label>
              <input
                id="home-search"
                type="search"
                name="search"
                defaultValue={filters.search || ""}
                placeholder="Banda, evento o lugar"
                className="min-h-12 border border-neutral-700 bg-black px-4 text-sm text-white placeholder:text-neutral-500 transition-colors hover:border-neutral-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <label className="sr-only" htmlFor="home-city">Ciudad</label>
              <input
                id="home-city"
                type="search"
                name="city"
                defaultValue={filters.city || ""}
                placeholder="Ciudad"
                className="min-h-12 border border-neutral-700 bg-black px-4 text-sm text-white placeholder:text-neutral-500 transition-colors hover:border-neutral-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="submit"
                className="min-h-12 bg-red-600 px-8 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Buscar fechas
              </button>
            </form>
          </div>
        </section>

        <section id="cartelera" aria-labelledby="events-heading" className="home-events-board pb-14 pt-6 sm:pb-20 sm:pt-8 lg:pt-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 border-b border-neutral-700 pb-5">
              <div>
                <p className="home-heading mb-2.5 text-sm font-black uppercase leading-none tracking-[0.2em] text-red-400">
                  La próxima fecha empieza acá
                </p>
                <h2 id="events-heading" className="home-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                  Cartelera de recitales
                </h2>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="border border-dashed border-neutral-700 bg-neutral-950 px-6 py-14 text-center">
                <h3 className="home-heading text-xl font-black text-white">No encontramos fechas</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                  Probá con otra banda, evento, lugar o ciudad. También podés volver a la cartelera completa.
                </p>
                {(filters.search || filters.city) && (
                  <Link href="/" className="mt-5 inline-block font-bold text-red-400 hover:underline">
                    Limpiar búsqueda
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(3,minmax(0,21.5rem))]">
                  {events.map((event, index) => (
                    <EventCard key={event.id} event={event} prioritizeImage={index === 0} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Páginas de la cartelera" className="mt-10 flex items-center justify-center gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={getPageHref(currentPage - 1, filters)}
                        aria-label="Ir a la página anterior"
                        className="grid h-9 min-w-9 place-items-center border border-neutral-700 bg-black/70 px-2 text-sm font-bold text-neutral-200 transition-colors hover:border-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        ←
                      </Link>
                    ) : (
                      <span aria-disabled="true" aria-label="No hay página anterior" className="grid h-9 min-w-9 cursor-not-allowed place-items-center border border-neutral-800 bg-black/40 px-2 text-sm text-neutral-600">
                        ←
                      </span>
                    )}

                    {pageItems.map((item, index) =>
                      item === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} aria-hidden="true" className="grid h-9 min-w-7 place-items-center text-neutral-500">
                          …
                        </span>
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

                    {currentPage < totalPages ? (
                      <Link
                        href={getPageHref(currentPage + 1, filters)}
                        aria-label="Ir a la página siguiente"
                        className="grid h-9 min-w-9 place-items-center border border-neutral-700 bg-black/70 px-2 text-sm font-bold text-neutral-200 transition-colors hover:border-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        →
                      </Link>
                    ) : (
                      <span aria-disabled="true" aria-label="No hay página siguiente" className="grid h-9 min-w-9 cursor-not-allowed place-items-center border border-neutral-800 bg-black/40 px-2 text-sm text-neutral-600">
                        →
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
