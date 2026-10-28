-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('POSTULACION_RECIBIDA', 'POSTULACION_ACEPTADA', 'POSTULACION_RECHAZADA', 'INVITACION_RECIBIDA', 'OFERTA_RECIBIDA', 'OFERTA_ACEPTADA', 'CONTRATACION_CANCELADA', 'EVENTO_CANCELADO');

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "TipoNotificacion" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_user_id_created_at_idx" ON "notificaciones"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notificaciones_user_id_is_read_idx" ON "notificaciones"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
