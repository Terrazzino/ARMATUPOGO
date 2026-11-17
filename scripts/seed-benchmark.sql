-- Seed sintético de 50.000 eventos para análisis de rendimiento (Clase 14)
-- Totalmente local y determinista. No contiene datos personales ni de producción.

BEGIN;

-- Usuario organizador sintético para satisfacer la foreign key
INSERT INTO "usuarios" ("id", "email", "first_name", "last_name", "role", "created_at", "updated_at")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'organizador.benchmark@example.com',
  'Organizador',
  'Benchmark',
  'ORGANIZADOR',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Limpieza de eventos anteriores de prueba si los hubiera
DELETE FROM "eventos" WHERE "organizer_id" = '11111111-1111-1111-1111-111111111111';

-- Generación de 50.000 eventos sintéticos:
-- - 35.000 eventos históricos (starts_at y ends_at en el pasado, entre -365 días y -1 día)
-- - 15.000 eventos futuros (starts_at y ends_at en el futuro, entre +1 día y +180 días)
-- - Distribución de estados: 90% 'PUBLICADO', 10% 'CANCELADO'
-- - Distribución de ciudades: Buenos Aires, Rosario, Córdoba, La Plata, Mendoza
INSERT INTO "eventos" (
  "id",
  "organizer_id",
  "title",
  "description",
  "starts_at",
  "ends_at",
  "location",
  "venue_name",
  "city",
  "required_musicians_count",
  "offered_cache",
  "status",
  "banner_url",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Recital Sintético ' || i,
  'Descripción del recital número ' || i || ' para medición de volumen de datos.',
  CASE
    WHEN i <= 35000 THEN
      NOW() - INTERVAL '365 days' + (i * INTERVAL '364 days' / 35000)
    ELSE
      NOW() + INTERVAL '1 day' + ((i - 35000) * INTERVAL '180 days' / 15000)
  END AS starts_at,
  CASE
    WHEN i <= 35000 THEN
      NOW() - INTERVAL '365 days' + (i * INTERVAL '364 days' / 35000) + INTERVAL '4 hours'
    ELSE
      NOW() + INTERVAL '1 day' + ((i - 35000) * INTERVAL '180 days' / 15000) + INTERVAL '4 hours'
  END AS ends_at,
  'Calle Falsa ' || (i % 1000),
  'Club de Música ' || (i % 50),
  (ARRAY['Buenos Aires', 'Rosario', 'Córdoba', 'La Plata', 'Mendoza'])[(i % 5) + 1],
  ((i % 4) + 1),
  ((i % 20 + 1) * 10000)::numeric(12, 2),
  CASE
    WHEN i % 10 = 0 THEN 'CANCELADO'::"EstadoEvento"
    ELSE 'PUBLICADO'::"EstadoEvento"
  END,
  NULL,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
FROM generate_series(1, 50000) AS s(i);

COMMIT;
