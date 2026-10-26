import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { getMyEvents } from "@/app/actions/events";
import { getMyContracts, getReceivedPostulations } from "@/app/actions/contracts";
import { getUserReputation } from "@/app/actions/ratings";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { DeferredCreateEventModal } from "@/components/events/DeferredCreateEventModal";
import { OrganizerEventsList } from "@/components/events/OrganizerEventsList";
import { OrganizerPostulationsList } from "@/components/contracts/OrganizerPostulationsList";
import { OrganizerContractsList } from "@/components/contracts/OrganizerContractsList";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { groupOrganizerEvents } from "@/lib/organizer-events";
import { groupOrganizerPostulations } from "@/lib/organizer-postulations";
import { groupOrganizerContracts } from "@/lib/organizer-contracts";

export const metadata = {
  title: "Panel de Organizador - Arma tu pogo",
  description: "Administra tus eventos, fechas y contrataciones de bandas",
};

export default async function OrganizerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.rol !== "ORGANIZADOR") {
    redirect("/dashboard/musician");
  }

  const [events, postulations, contracts, reputation] = await Promise.all([
    getMyEvents(),
    getReceivedPostulations(),
    getMyContracts(),
    getUserReputation(user.id),
  ]);
  const now = new Date();
  const organizerEventGroups = groupOrganizerEvents(
    events.map((event) => ({
      id: event.id,
      titulo: event.titulo,
      descripcion: event.descripcion,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      ubicacion: event.ubicacion,
      nombreLugar: event.nombreLugar,
      ciudad: event.ciudad,
      cantidadMusicosRequerida: event.cantidadMusicosRequerida,
      cacheOfrecido: event.cacheOfrecido ? Number(event.cacheOfrecido) : null,
      bannerUrl: event.bannerUrl,
      estado: event.estado,
      contrataciones: event.contrataciones.map(({ estado }) => ({ estado })),
    })),
    now
  );
  const organizerPostulationGroups = groupOrganizerPostulations(
    postulations.map((postulation) => ({
      ...postulation,
      creadoEn: postulation.creadoEn.toISOString(),
      evento: {
        ...postulation.evento,
        startsAt: postulation.evento.startsAt.toISOString(),
      },
    }))
  );
  const organizerContractGroups = groupOrganizerContracts(
    contracts.map((contract) => ({
      id: contract.id,
      estado: contract.estado,
      montoPactado: contract.montoPactado,
      fechaAcuerdo: contract.fechaAcuerdo?.toISOString() ?? null,
      motivoCancelacion: contract.motivoCancelacion,
      hasCurrentUserRating: contract.hasCurrentUserRating,
      evento: {
        ...contract.evento,
        startsAt: contract.evento.startsAt.toISOString(),
        endsAt: contract.evento.endsAt.toISOString(),
      },
      proyectoMusical: {
        id: contract.proyectoMusical.id,
        nombre: contract.proyectoMusical.nombre,
        genero: contract.proyectoMusical.genero,
      },
      organizador: contract.organizador,
      musico: contract.musico,
      ofertas: contract.ofertas.map((offer) => ({
        ...offer,
        creadoEn: offer.creadoEn.toISOString(),
      })),
    })),
    now
  );

  return (
    <div className="atp-page flex min-h-screen flex-col">
      <Navbar variant="dashboard" />

      <main className="atp-container w-full flex-1 space-y-8 py-8 sm:space-y-10 sm:py-10">
        <DashboardHeader
          roleLabel="Panel de organizador"
          name={`${user.nombre} ${user.apellido}`}
          email={user.email}
          resourceSummary={`${events.length} ${events.length === 1 ? "evento publicado" : "eventos publicados"}`}
          reputationScore={reputation.averageScore}
          reputationTotal={reputation.total}
          variant="plain"
        />

        <section className="space-y-5" aria-labelledby="organizer-events-title">
          <DashboardSectionHeader
            headingId="organizer-events-title"
            title="Mis Eventos y Recitales"
            description="Publica fechas, administra cupos de bandas y revisa convocatorias"
            action={<DeferredCreateEventModal />}
          />

          {events.length === 0 ? (
            <DashboardEmptyState
              icon={
                <Image
                  src="/branding/calendario-256.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto block h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
              }
              title="Aún no publicaste ningún evento"
              description="Publica tu primera fecha para recibir postulaciones de bandas y solistas."
              action={<DeferredCreateEventModal />}
            />
          ) : (
            <OrganizerEventsList groups={organizerEventGroups} now={now.toISOString()} />
          )}
        </section>

        <section className="space-y-5" aria-labelledby="organizer-postulations-title">
          <DashboardSectionHeader
            headingId="organizer-postulations-title"
            title="Postulaciones recibidas"
            description="Revisa las solicitudes enviadas a tus eventos y gestiona las que están pendientes."
          />

          {postulations.length === 0 ? (
            <DashboardEmptyState
              icon={
                <Image
                  src="/branding/postulaciones-256.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto block h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
              }
              title="No hay postulaciones recibidas"
              description="Cuando un proyecto se postule a uno de tus eventos, aparecerá aquí."
            />
          ) : (
            <OrganizerPostulationsList groups={organizerPostulationGroups} />
          )}
        </section>

        <section className="space-y-5" aria-labelledby="organizer-negotiations-title">
          <DashboardSectionHeader
            headingId="organizer-negotiations-title"
            title="Negociaciones y Contrataciones"
            description="Gestiona las propuestas económicas recibidas de bandas y envía contraofertas"
            action={(
              <Link href="/projects" className="atp-button atp-button-ghost text-sm">
                Buscar Bandas y Solistas →
              </Link>
            )}
          />

          {contracts.length === 0 ? (
            <DashboardEmptyState
              icon={
                <Image
                  src="/branding/contrato-256.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto block h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
              }
              title="No hay negociaciones iniciadas"
              description="También puedes buscar proyectos musicales en el catálogo e invitarlos directamente a tus fechas."
              action={(
                <Link href="/projects" className="atp-button atp-button-primary text-sm">
                  Buscar Bandas
                </Link>
              )}
            />
          ) : (
            <OrganizerContractsList
              groups={organizerContractGroups}
              currentUserId={user.id}
              now={now.toISOString()}
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
