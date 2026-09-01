import { getPublicEvents } from "@/app/actions/events";
import { EventCard } from "@/components/events/EventCard";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

interface EventsPageProps {
  searchParams: Promise<{ search?: string; city?: string }>;
}

export const metadata = {
  title: "Cartelera de Recitales - Arma tu pogo",
  description: "Descubre los próximos recitales y fechas de bandas en vivo.",
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const events = await getPublicEvents({
    search: params.search,
    city: params.city,
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Cartelera de Recitales
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-base">
            Explora las próximas fechas, descubre nuevas bandas y asiste a recitales independientes.
          </p>
        </div>

        {/* Search / Filter Bar */}
        <form method="GET" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Buscar por nombre, sala o descripción..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-60">
            <input
              type="text"
              name="city"
              defaultValue={params.city || ""}
              placeholder="Ciudad o localidad..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Buscar
          </button>
        </form>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto mt-6">
            <span className="text-4xl mb-3 block">🎸</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No se encontraron recitales</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Prueba cambiando los términos de búsqueda o vuelve a consultar más tarde.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
