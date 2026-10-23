import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";
import { getMyProjects } from "@/app/actions/projects";
import { getMyContracts, getMyPendingPostulations } from "@/app/actions/contracts";
import { getUserReputation } from "@/app/actions/ratings";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { DeferredCreateProjectModal } from "@/components/projects/DeferredCreateProjectModal";
import { MusicianEngagements } from "@/components/contracts/MusicianEngagements";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export const metadata = {
  title: "Panel de Músico - Arma tu pogo",
  description: "Administra tus proyectos musicales y negociaciones de recitales",
};

export default async function MusicianDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.rol !== "MUSICO") {
    redirect("/dashboard/organizer");
  }

  const [projects, contracts, postulations, reputation] = await Promise.all([
    getMyProjects(),
    getMyContracts(),
    getMyPendingPostulations(),
    getUserReputation(user.id),
  ]);

  return (
    <div className="atp-page flex min-h-screen flex-col">
      <Navbar variant="dashboard" />

      <main className="atp-container w-full flex-1 space-y-8 py-8 sm:space-y-10 sm:py-10">
        <DashboardHeader
          roleLabel="Panel de músico"
          name={`${user.nombre} ${user.apellido}`}
          email={user.email}
          resourceSummary={`${projects.length} ${projects.length === 1 ? "proyecto registrado" : "proyectos registrados"}`}
          reputationScore={reputation.averageScore}
          reputationTotal={reputation.total}
          variant="plain"
        />

        <section className="space-y-5" aria-labelledby="musician-projects-title">
          <DashboardSectionHeader
            headingId="musician-projects-title"
            title="Mis Proyectos Musicales"
            description="Administra las bandas y propuestas artísticas de tu cuenta"
            action={<DeferredCreateProjectModal />}
          />

          {projects.length === 0 ? (
            <DashboardEmptyState
              icon="🎸"
              title="Aún no registraste ninguna banda"
              description="Crea tu primer proyecto musical para poder postularte a las fechas disponibles."
              action={<DeferredCreateProjectModal />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  variant="dashboard"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5" aria-labelledby="musician-negotiations-title">
          <DashboardSectionHeader
            headingId="musician-negotiations-title"
            title="Mis Fechas y Contrataciones"
            description="Consulta tus acuerdos confirmados, postulaciones y negociaciones activas"
            action={(
              <Link href="/events" className="atp-button atp-button-ghost text-sm">
                Explorar Cartelera →
              </Link>
            )}
          />

          <MusicianEngagements
            contracts={contracts}
            postulations={postulations}
            currentUserId={user.id}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
