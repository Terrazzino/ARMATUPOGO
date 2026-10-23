import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { getMyEvents } from "@/app/actions/events";
import { DeferredInviteModal } from "@/components/contracts/DeferredInviteModal";
import { RockHandIcon, RockHandScale, RockHandScore } from "@/components/ratings/RockHandRating";
import { Footer } from "@/components/shared/Footer";
import { Navbar } from "@/components/shared/Navbar";
import { getPublicProjectDetailForRender } from "@/lib/public-detail-data";
import { getProjectReputationPresentation } from "@/lib/rating-presentation";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ProjectLink {
  label: string;
  url: string;
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function externalLink(label: string, value?: string | null): ProjectLink | null {
  return value && isSafeExternalUrl(value) ? { label, url: value } : null;
}

function getCustomLinks(value: unknown): ProjectLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { title?: unknown; label?: unknown; url?: unknown };
    if (typeof candidate.url !== "string" || !isSafeExternalUrl(candidate.url)) return [];
    const rawLabel = typeof candidate.title === "string"
      ? candidate.title
      : typeof candidate.label === "string"
        ? candidate.label
        : "Enlace";
    return [{ label: rawLabel.trim() || "Enlace", url: candidate.url }];
  });
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getPublicProjectDetailForRender(id);
  if (!project) return { title: "Proyecto no encontrado - Arma tu pogo" };
  return {
    title: project.nombre + " (" + project.genero + ") - Arma tu pogo",
    description: project.descripcion || "Perfil de " + project.nombre + " en Arma tu pogo",
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const [project, user] = await Promise.all([
    getPublicProjectDetailForRender(id),
    getCurrentUser(),
  ]);

  if (!project) notFound();

  const reputation = getProjectReputationPresentation(project.valoraciones);
  const organizerEvents = user?.rol === "ORGANIZADOR" ? await getMyEvents() : [];
  const cache = project.cacheAproximado && Number(project.cacheAproximado.toString()) > 0
    ? "$" + Number(project.cacheAproximado.toString()).toLocaleString("es-AR")
    : null;
  const projectLinks = [
    externalLink("Spotify", project.spotifyUrl),
    externalLink("YouTube", project.youtubeUrl),
    externalLink("Instagram", project.instagramUrl),
    externalLink("Sitio web", project.sitioWebUrl),
    ...getCustomLinks(project.enlacesPersonalizados),
  ].filter((link): link is ProjectLink => link !== null);

  return (
    <div className="atp-page flex min-h-screen flex-col">
      <Navbar
        variant={user ? "dashboard" : "public"}
        activeItem={user?.rol === "ORGANIZADOR" ? "discovery" : null}
      />

      <main className="atp-container w-full flex-1 py-7 sm:py-10">
        <Link
          href="/projects"
          className="inline-flex text-sm font-bold text-neutral-400 underline-offset-4 hover:text-red-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          ← Volver al catálogo de bandas
        </Link>

        <header className="mt-6 grid gap-7 border-b border-neutral-800 pb-8 md:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)] md:items-center lg:gap-10">
          <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden border border-neutral-800 bg-neutral-900 p-5 md:mx-0">
            {project.imagenUrl ? (
              // Las imágenes pueden provenir de hosts externos no configurados en Next Image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.imagenUrl}
                alt={"Imagen de " + project.nombre}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-contain"
              />
            ) : (
              <div
                className="grid h-full w-full place-items-center border border-dashed border-neutral-800 bg-neutral-950 px-5 text-center"
                aria-label="Imagen del proyecto no disponible"
              >
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-600">
                  Sin imagen del proyecto
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="atp-kicker">Proyecto musical</p>
            <h1 className="atp-heading atp-page-title mt-4 break-words">{project.nombre}</h1>
            <dl className="mt-7 grid gap-4 border-l-2 border-red-600 pl-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="atp-label text-neutral-500">Género musical</dt>
                <dd className="mt-1 font-bold text-neutral-100">{project.genero}</dd>
              </div>
              {project.ciudad && (
                <div>
                  <dt className="atp-label text-neutral-500">Ciudad</dt>
                  <dd className="mt-1 font-bold text-neutral-100">{project.ciudad}</dd>
                </div>
              )}
              {project.ubicacion && (
                <div>
                  <dt className="atp-label text-neutral-500">Ubicación</dt>
                  <dd className="mt-1 font-bold text-neutral-100">{project.ubicacion}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-8 max-w-5xl space-y-10">
          <section className="border-b border-neutral-800 pb-10" aria-labelledby="project-biography-title">
            <p className="atp-kicker">Sobre el proyecto</p>
            <h2 id="project-biography-title" className="atp-heading mt-1 text-3xl">Biografía y propuesta</h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-neutral-300">
              {project.descripcion || "Este proyecto todavía no publicó una descripción."}
            </p>
          </section>

          <section className="border-b border-neutral-800 pb-10" aria-labelledby="project-data-title">
            <p className="atp-kicker">Información</p>
            <h2 id="project-data-title" className="atp-heading mt-1 text-3xl">Datos del proyecto</h2>
            <dl className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="py-4">
                <dt className="atp-label text-neutral-500">Género musical</dt>
                <dd className="mt-1 text-lg font-bold text-neutral-100">{project.genero}</dd>
              </div>
              {project.ciudad && (
                <div className="py-4">
                  <dt className="atp-label text-neutral-500">Ciudad</dt>
                  <dd className="mt-1 text-lg font-bold text-neutral-100">{project.ciudad}</dd>
                </div>
              )}
              {project.ubicacion && (
                <div className="py-4">
                  <dt className="atp-label text-neutral-500">Ubicación</dt>
                  <dd className="mt-1 text-lg font-bold text-neutral-100">{project.ubicacion}</dd>
                </div>
              )}
              {cache && (
                <div className="py-4">
                  <dt className="atp-label text-neutral-500">Caché orientativo</dt>
                  <dd className="mt-1 text-lg font-bold text-neutral-100">{cache}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="border-b border-neutral-800 pb-10" aria-labelledby="project-links-title">
            <p className="atp-kicker">Escuchá a la banda</p>
            <h2 id="project-links-title" className="atp-heading mt-1 text-3xl">Música y redes</h2>
            {projectLinks.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-3">
                {projectLinks.map((link, index) => (
                  <li key={link.url + "-" + index}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="atp-button atp-button-secondary min-h-10 px-4 text-sm"
                    >
                      {link.label}<span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-400">
                Este proyecto todavía no publicó enlaces de música o redes.
              </p>
            )}
          </section>

          <section className="border-b border-neutral-800 pb-10" aria-labelledby="project-ratings-title">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <p className="atp-kicker">Experiencias en vivo</p>
                <h2 id="project-ratings-title" className="atp-heading mt-1 text-3xl">Historial de valoraciones</h2>
              </div>
              {reputation.total > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
                  <RockHandScore
                    score={reputation.averageScore}
                    total={reputation.total}
                    iconSize={22}
                    className="text-neutral-100"
                  />
                  <span>{reputation.total === 1 ? "1 valoración" : reputation.total + " valoraciones"}</span>
                </div>
              )}
            </div>

            {reputation.ratings.length === 0 ? (
              <div className="mt-5 flex items-start gap-3 border-l-2 border-neutral-700 pl-3 text-neutral-400">
                <RockHandIcon size={32} className="mt-0.5 opacity-60" />
                <div>
                  <p className="font-bold text-neutral-200">Aún no posee valoraciones</p>
                  <p className="mt-1 text-sm">Las valoraciones se generan tras completar fechas acordadas en la plataforma.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {reputation.ratings.map((rating) => (
                  <li key={rating.id} className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RockHandScale score={rating.puntaje} size={20} />
                      <time dateTime={new Date(rating.creadoEn).toISOString()} className="text-xs text-neutral-500">
                        {new Date(rating.creadoEn).toLocaleDateString("es-AR")}
                      </time>
                    </div>
                    {rating.comentario && (
                      <p className="mt-3 whitespace-pre-line text-base italic leading-relaxed text-neutral-300">
                        &ldquo;{rating.comentario}&rdquo;
                      </p>
                    )}
                    <p className="mt-2 text-sm font-bold text-neutral-500">
                      — Por {rating.autor.nombre} {rating.autor.apellido}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {user?.rol === "ORGANIZADOR" && (
            <section aria-labelledby="project-invite-title">
              <p className="atp-kicker">Contrataciones</p>
              <h2 id="project-invite-title" className="atp-heading mt-1 text-3xl">¿Querés contratar esta banda?</h2>
              <div className="mt-5">
                <DeferredInviteModal projectId={project.id} projectName={project.nombre} events={organizerEvents} />
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
