-- CreateIndex: garantiza a nivel de base de datos que una contratación sólo pueda tener como máximo una oferta activa en estado 'PROPUESTA' (@see docs/spec.md § 5.6 y H8)
CREATE UNIQUE INDEX "ofertas_contract_id_propuesta_activa_key" ON "ofertas"("contract_id") WHERE "status" = 'PROPUESTA';
