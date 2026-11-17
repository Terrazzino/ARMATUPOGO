-- CreateIndex: optimiza la consulta frecuente de la cartelera pública de eventos y el conteo paginado (@see docs/spec.md H6, H7 y Clase 14)
CREATE INDEX "eventos_status_ends_at_starts_at_idx" ON "eventos"("status", "ends_at", "starts_at");
