-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('MUSICO', 'ORGANIZADOR');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PUBLICADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoContratacion" AS ENUM ('NEGOCIANDO', 'ACORDADO', 'CANCELADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "EstadoOferta" AS ENUM ('PROPUESTA', 'ACEPTADA', 'RECHAZADA', 'CONTRAOFERTADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "RolUsuario" NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyectos_musicales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "genre" TEXT NOT NULL,
    "approximate_cache" DECIMAL(12,2),
    "location" TEXT,
    "city" TEXT,
    "image_url" TEXT,
    "spotify_url" TEXT,
    "youtube_url" TEXT,
    "instagram_url" TEXT,
    "website_url" TEXT,
    "custom_links" JSONB DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyectos_musicales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "venue_name" TEXT,
    "city" TEXT,
    "required_musicians_count" INTEGER NOT NULL DEFAULT 1,
    "offered_cache" DECIMAL(12,2),
    "status" "EstadoEvento" NOT NULL DEFAULT 'PUBLICADO',
    "banner_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "musical_project_id" UUID NOT NULL,
    "musician_id" UUID NOT NULL,
    "status" "EstadoPostulacion" NOT NULL DEFAULT 'PENDIENTE',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrataciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "musical_project_id" UUID NOT NULL,
    "postulation_id" UUID,
    "organizer_id" UUID NOT NULL,
    "musician_id" UUID NOT NULL,
    "status" "EstadoContratacion" NOT NULL DEFAULT 'NEGOCIANDO',
    "agreed_amount" DECIMAL(12,2),
    "agreed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrataciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "message" TEXT,
    "status" "EstadoOferta" NOT NULL DEFAULT 'PROPUESTA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ofertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valoraciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "target_project_id" UUID,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valoraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "ticket_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "capacity" INTEGER,
    "description" TEXT,
    "external_purchase_url" TEXT,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entradas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "postulaciones_event_id_musical_project_id_key" ON "postulaciones"("event_id", "musical_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "contrataciones_postulation_id_key" ON "contrataciones"("postulation_id");

-- CreateIndex
CREATE UNIQUE INDEX "contrataciones_event_id_musical_project_id_key" ON "contrataciones"("event_id", "musical_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "valoraciones_contract_id_author_id_key" ON "valoraciones"("contract_id", "author_id");

-- AddForeignKey
ALTER TABLE "proyectos_musicales" ADD CONSTRAINT "proyectos_musicales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_musical_project_id_fkey" FOREIGN KEY ("musical_project_id") REFERENCES "proyectos_musicales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_musician_id_fkey" FOREIGN KEY ("musician_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_musical_project_id_fkey" FOREIGN KEY ("musical_project_id") REFERENCES "proyectos_musicales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_postulation_id_fkey" FOREIGN KEY ("postulation_id") REFERENCES "postulaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_musician_id_fkey" FOREIGN KEY ("musician_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrataciones" ADD CONSTRAINT "contrataciones_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contrataciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contrataciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_target_project_id_fkey" FOREIGN KEY ("target_project_id") REFERENCES "proyectos_musicales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
