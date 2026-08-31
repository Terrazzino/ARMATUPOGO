export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Bienvenido a Backstage
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            El marketplace donde conectan músicos, organizadores y público.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Músicos
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Registra tus proyectos y postúlate a eventos
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Organizadores
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Publica eventos y encuentra los mejores artistas
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Público
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Descubre eventos y artistas en la cartelera
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12">
          <p>Plataforma en desarrollo • Fase 0: Preparación técnica</p>
        </div>
      </main>
    </div>
  );
}
