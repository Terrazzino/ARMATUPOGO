# Estado operativo del proyecto — Arma tu Pogo

> **Rama auditada:** `feature/responsive-layout`  
> **Commit auditado:** `33b93c7`  
> **Fecha de auditoría:** 2026-10-27  
> **Estado Git:** limpio al momento de la auditoría  
> **Estado general:** **ESTABLE CON DEUDA**

Este documento debe actualizarse después de integrar cambios funcionales relevantes a la rama compartida.

## 1. Propósito y fuentes de verdad

Este archivo es la fotografía operativa del código que existe actualmente. Permite conocer rápidamente qué está implementado, qué está parcial, qué falta, qué deuda existe y qué trabajo está en curso.

- `docs/spec.md`: fuente de verdad funcional y de reglas del producto.
- `docs/estado-proyecto.md`: fuente de verdad operativa del estado actual del repositorio.
- `prisma/schema.prisma`: fuente autoritativa del modelo de datos.

Ante diferencias, primero se debe inspeccionar el código y luego resolver explícitamente la divergencia; este documento no autoriza a contradecir `docs/spec.md`.

## 2. Resumen actual

Arma tu Pogo conecta músicos y proyectos musicales con organizadores mediante publicación de eventos, postulaciones, contratación directa, negociación de ofertas, acuerdos, finalización de fechas y valoraciones/reputación.

| Indicador auditado | Estado |
|---|---:|
| Entidades Prisma | 8 |
| Archivos `route.ts` | 26 |
| Operaciones HTTP | 36 |
| Server Actions | 39 |
| Páginas compiladas | 20 |
| Archivos de tests ejecutados | 34 |
| Tests aprobados | 359/359 |
| Autenticación | Supabase Auth |
| Base de datos | PostgreSQL en Supabase |
| Archivos | Supabase Storage para proyectos y eventos |

## 3. Stack actual

- Next.js 16.3.4 con App Router y Turbopack.
- React 19.2.8.
- TypeScript 5.
- Tailwind CSS 4.
- React Hook Form.
- Zod 4.
- Prisma 6.19.3.
- PostgreSQL administrado por Supabase.
- Supabase Auth y Supabase Storage.
- Vitest 5.
- `proxy.ts` para protección de navegación.

## 4. Arquitectura del repositorio

| Zona | Responsabilidad actual |
|---|---|
| `app/` | Páginas App Router, layouts, rutas públicas y dashboards. |
| `app/api/` | Route Handlers REST. Cada operación privada vuelve a autenticar y autorizar. |
| `app/actions/` | Server Actions consumidas principalmente por la UI y loaders del servidor. |
| `components/` | Componentes visuales, formularios, modales y componentes cliente interactivos. |
| `lib/*-access.ts` | Acceso a datos y reglas compartidas por Route Handlers y Server Actions. |
| `lib/validations/` | Contratos Zod para entradas no confiables. |
| `lib/services/` | Aislamiento de Supabase Auth y Storage. |
| `lib/supabase/` | Clientes SSR y navegador, con timeout de 5 segundos. |
| `prisma/` | Schema autoritativo (`schema.prisma`) y migraciones canónicas de negocio (`prisma/migrations/**`). |
| `supabase/migrations/` | SQL específico de Supabase exclusivamente para infraestructura y políticas de Storage (`project-images` y `event-images`). |
| `test/` | Pruebas unitarias, de Actions, algunos Route Handlers y políticas. |
| `docs/` | Especificación, ADR, API y documentación operativa. |

**Regla para agentes:** la lógica de negocio compartida entre Route Handlers y Server Actions debe permanecer en helpers o capas compartidas cuando corresponda; evitar duplicarla.

## 5. Modelo de datos actual

| Entidad | Función y uso actual | Relaciones y estados relevantes |
|---|---|---|
| `Usuario` | Perfil local autenticado; en uso completo. | Dueño de proyectos/eventos y participante de contratos, ofertas y valoraciones. Rol `MUSICO` u `ORGANIZADOR`. |
| `ProyectoMusical` | Banda, solista o propuesta artística; en uso completo. | Pertenece a un usuario; tiene postulaciones, contratos y valoraciones. Baja lógica mediante `estaActivo`. |
| `Evento` | Fecha publicada por un organizador; en uso completo. | Tiene postulaciones, contratos y entradas. Estados `PUBLICADO` y `CANCELADO`. |
| `Postulacion` | Presentación de un proyecto a un evento; en uso completo. | Vincula evento, proyecto y músico. Estados `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `CANCELADA`. |
| `Contratacion` | Proceso contractual por postulación o invitación; en uso completo. | Vincula evento, proyecto, músico, organizador, ofertas y valoraciones. Estados `NEGOCIANDO`, `ACORDADO`, `CANCELADO`, `COMPLETADO`. |
| `Oferta` | Historial económico de una negociación; en uso completo. | Pertenece a un contrato y remitente. Estados `PROPUESTA`, `ACEPTADA`, `RECHAZADA`, `CONTRAOFERTADA`. |
| `Valoracion` | Reputación posterior a una fecha completada; en uso completo. | Vincula contrato, autor, destinatario y, cuando corresponde, proyecto destinatario. |
| `Entrada` | Tipos y precios informativos de eventos; uso parcial. | Relación N:1 con evento; permite múltiples tipos y precios. |

`prisma/schema.prisma` es la fuente autoritativa del modelo de datos y `prisma/migrations/**` su único camino de migración canónico.

Se eliminó el archivo obsoleto `supabase/migrations/202609010001_init_prisma_supabase.sql` que contenía un modelo histórico incompatible. No existen segundas copias manuales del esquema relacional.

## 6. Matriz funcional

| Dominio | Estado | Observaciones |
|---|---|---|
| Usuarios | PARCIAL | Registro, login, logout y API de perfil existen; no hay UI para editar el perfil. |
| Proyectos | COMPLETO con limitación operativa | ABM, baja lógica, perfiles, búsqueda e imágenes; Storage remoto debe estar configurado. |
| Eventos | COMPLETO con limitación | ABM, cancelación, cartelera, detalle y flyers; el alta con flyer está bloqueada y se agrega al editar. |
| Postulaciones | COMPLETO | Crear, listar, aceptar, rechazar y cancelar con ownership. |
| Contrataciones | COMPLETO | Flujo por postulación y contratación directa, cancelación y finalización. |
| Ofertas | COMPLETO con riesgo concurrente | Negociación funcional; la exclusividad concurrente de `PROPUESTA` no está garantizada. |
| Valoraciones | COMPLETO | Sólo tras completar; una por autor y contratación. |
| Entradas | PARCIAL | Modelo y lectura pública existen; no hay flujo de escritura ni formularios. |
| Autenticación | COMPLETO con deuda | Supabase Auth, cookies/Bearer, proxy y ownership; alta Auth→Prisma sin compensación. |
| Servicios externos | PARCIALMENTE VERIFICABLE | Implementados en código; la configuración remota efectiva no se verificó. |
| Notificaciones | NO IMPLEMENTADO | No existe entidad, inbox, badge, API ni mecanismo de actualización. |
| Historial de cancelaciones del músico | COMPLETO (MVP) | Pestaña "Canceladas" en el panel del músico para fechas confirmadas cuyo evento fue cancelado por el organizador. |

## 7. Flujo principal de negocio

### Por postulación

Organizador crea evento → músico encuentra evento → músico se postula → organizador acepta o rechaza → contratación `NEGOCIANDO` → ofertas/contraofertas → oferta aceptada → contratación `ACORDADO` → evento finaliza → contratación `COMPLETADO` → valoraciones.

### Por contratación directa

Organizador descubre un proyecto → lo invita a un evento propio → contrato `NEGOCIANDO` → mismo flujo de negociación, acuerdo, finalización y valoración.

## 8. Autenticación y autorización

- Identidad: Supabase Auth.
- Sesión web: cookies de Supabase SSR.
- API: cookie válida o `Authorization: Bearer <access_token>`.
- Validación de identidad: `supabase.auth.getUser()`.
- Perfil y rol autoritativos: Prisma `Usuario` y `Usuario.rol`.
- Roles autenticados: `MUSICO` y `ORGANIZADOR`.
- Ownership/participación: incorporados a las consultas privadas cuando corresponde.
- `401`: identidad no autenticada.
- `403`: rol incorrecto.
- `404`: recurso inexistente o no accesible para el usuario.
- `409`: conflicto de reglas de negocio o estado.

`x-user-id` **no es un mecanismo de autenticación admitido** y debe seguir ignorándose.

## 9. Frontend por rol

### Público

- Home y cartelera paginada.
- Catálogo y perfiles públicos de proyectos.
- Detalle público de eventos, line-up y precios informativos.
- Consulta pública de reputación.
- Login y registro.

### Músico

- Crear, editar y activar/desactivar proyectos.
- Subir, reemplazar y quitar imagen del proyecto.
- Buscar eventos, postularse y cancelar postulaciones pendientes.
- Negociar, consultar fechas confirmadas/finalizadas y completar contratos.
- Valorar organizadores.

**Limitación vigente:** el músico no visualiza contratos, eventos ni postulaciones cancelados en su dashboard.

### Organizador

- Crear, editar y cancelar eventos.
- Agregar, reemplazar o quitar flyers en eventos existentes.
- Consultar eventos próximos, finalizados y cancelados.
- Buscar e invitar proyectos.
- Resolver postulaciones, negociar, acordar, completar y valorar.
- Consultar historial unificado de postulaciones y contratos.

### Auth

- Registro con rol, login y logout.
- Confirmación de email delegada a Supabase.
- No existe recuperación de contraseña ni edición de perfil desde la UI.

## 10. Integraciones externas

| Servicio | Finalidad | Estado | Observaciones |
|---|---|---|---|
| Supabase Auth | Identidad, sesión y confirmación de email | Implementado | Esencial; timeout de 5 segundos y comportamiento fail-safe. |
| PostgreSQL Supabase | Persistencia de dominio mediante Prisma | Implementado | Configuración auditada en región `sa-east-1`; runtime mediante pooler. Migración canónica `20260909020221_init` verificada en `_prisma_migrations`. |
| Supabase Storage | Imágenes de proyectos y flyers | Implementado, verificado en BD remota | Buckets `project-images` y `event-images` y sus políticas RLS comprobados en remoto. Scripts versionados en `supabase/migrations/`. Historial de Supabase CLI no normalizado (conserva `00001`). |

## 11. Tests y calidad

Última validación auditada sobre `33b93c7`:

| Comando | Resultado |
|---|---|
| `npm run lint` | OK |
| `npx tsc --noEmit` | OK |
| `npm test -- --run` | 359/359 tests aprobados en 34 archivos |
| `npm run build` | OK; 20 páginas compiladas |

- Se incorporó `test/offer-access.test.ts` (10 tests unitarios con mocks transaccionales) para verificar que las lecturas de oferta, cupo y agenda se realicen dentro de `tx` Serializable y se controle el retry ante `P2034`.
- La concurrencia SSI real de PostgreSQL se valida conceptualmente y mediante mocks; no existen pruebas de integración concurrentes automatizadas contra una instancia PostgreSQL real en CI.
- `test/phase2-model-security.test.mjs` existe, pero actualmente no forma parte del patrón `test/**/*.test.ts` ejecutado por Vitest.

No existen pruebas E2E de navegador ni verificación remota real de Auth/Storage dentro de la suite habitual.

## 12. Deuda técnica priorizada

### P0 — Bloqueante antes de producción

No hay bloqueantes P0 conocidos (**P0 = 0**).

- Resuelto: Transaccionalidad Serializable integral y retry acotado de `P2034` en `acceptOfferAsCounterparty` (`lib/offer-access.ts`).
- Resuelto: Saneamiento de inicialización de BD: eliminación del SQL obsoleto de Supabase y consolidación de Prisma Migrate como único camino canónico.

### P1 — Importante

- `createOfferForParticipant` puede permitir dos ofertas `PROPUESTA` concurrentes.
- Registro Supabase → Prisma sin compensación ante fallo del perfil local.
- El historial de Supabase CLI aún no está normalizado: la base remota conserva `00001`, mientras los scripts actuales de Storage fueron aplicados manualmente.
- El test `.mjs` de seguridad queda fuera de la suite.

### P2 — Mejora

- Cobertura directa incompleta de Route Handlers de contratos, ofertas, postulaciones y valoraciones.
- No hay E2E ni integración real con servicios externos.
- Faltan índices explícitos para filtros frecuentes por fecha, estado y relaciones.
- Una postulación duplicada concurrente puede terminar normalizada como `500` aunque el unique preserve integridad.
- La API/Actions JSON todavía admiten URLs directas de imagen mientras la UI usa Storage.
- El detalle público obtiene datos completos de entradas, pero no los presenta.

### P3 — Opcional

- Confirmar y retirar `components/contracts/PostulationCard.tsx`, actualmente sin consumidores.
- Revisar Actions de lectura sin consumidor UI actual.
- Actualizar comentarios y referencias históricas menores.

## 13. Backlog próximo

| Feature | Estado actual | Complejidad | Requiere migración | Prioridad |
|---|---|---:|---|---|
| Historial de fechas canceladas para artistas | COMPLETO (MVP) | MEDIA | No para versión mínima | Completada |
| Sistema de notificaciones | NO IMPLEMENTADO | ALTA | Sí, si es persistente | Próxima, requiere decisión |
| Precio de entrada gestionado por organizador | PARCIAL | MEDIA | No con el modelo actual | Próxima |

### Historial de fechas canceladas para artistas (MVP)

Implementado en el dashboard del músico mediante la pestaña "Canceladas", agrupando contrataciones acordadas (`fechaAcuerdo !== null`) cuyos eventos fueron cancelados por el organizador (`evento.estado === "CANCELADO"`), con detalle de fecha de cancelación, motivo y monto acordado.

### Sistema de notificaciones

No existen entidad, leído/no leído, badge, inbox, Actions/API, Realtime ni polling. Antes de diseñarlo debe decidirse si será inbox persistente, polling/Realtime o una combinación. Una solución persistente probablemente requiere migración.

### Precio de entrada gestionado por organizador

`Entrada` ya posee `tipoEntrada`, `precio`, `capacidad`, `descripcion`, `urlCompraExterna` y `esGratuita`; soporta múltiples tipos/precios por evento. Faltan validación, Actions/API de escritura, formulario, edición, altas/bajas y visualización completa. No necesita migración para usar el modelo actual.

## 14. Trabajo en progreso

Estados sugeridos: `PENDIENTE`, `EN ANÁLISIS`, `EN PROGRESO`, `EN REVIEW`, `BLOQUEADO`, `COMPLETADO`.

| Feature/Tarea | Responsable | Rama | Estado | Archivos principales | Última actualización |
|---|---|---|---|---|---|
| Corrección P0 `acceptOfferAsCounterparty` | — | `feature/fixbackend` | COMPLETADO | `lib/offer-access.ts`, `test/offer-access.test.ts` | 2026-10-27 |
| Saneamiento P0 de migraciones e inicialización de BD | — | `feature/fixbackend` | COMPLETADO | `supabase/migrations/202609010001_init_prisma_supabase.sql` (eliminado), `docs/DATABASE.md`, `README.md`, `docs/estado-proyecto.md` | 2026-10-27 |
| Historial de fechas canceladas para músicos | — | `feature/fixbackend` | COMPLETADO | `lib/musician-engagements.ts`, `components/contracts/MusicianEngagements.tsx`, `test/musician-engagements.test.ts` | 2026-10-27 |

No inferir responsables ni trabajo activo sólo por la existencia de una rama. Esta tabla debe actualizarse al comenzar y terminar cada tarea compartida.

## 15. Archivos de alto riesgo de conflicto

- `prisma/schema.prisma`.
- `prisma/migrations/**` y `supabase/migrations/**`.
- `app/actions/contracts.ts`.
- `lib/offer-access.ts`.
- `app/dashboard/musician/page.tsx`.
- `app/dashboard/organizer/page.tsx`.
- `components/contracts/MusicianEngagements.tsx`.
- `components/contracts/OrganizerEngagements.tsx`.
- `components/contracts/OrganizerContractsList.tsx`.
- `components/contracts/OrganizerPostulationsList.tsx`.
- `docs/estado-proyecto.md`.

Si dos ramas necesitan modificar alguno de estos archivos, coordinar antes de implementar.

## 16. Decisiones abiertas

1. **Notificaciones:** persistentes, Realtime/polling o combinación.
2. **Historial de cancelaciones:** versión mínima basada en `Contratacion` o modelo de auditoría más completo.
3. **Entradas:** UI simplificada de precio único o gestión explícita de múltiples tipos.
4. **Migraciones:** RESUELTO. Prisma Migrate es la única fuente autoritativa del modelo de negocio (`prisma/migrations/**`). Se eliminó el SQL obsoleto e incompatible de `supabase/migrations/`. Supabase SQL se reserva estrictamente para infraestructura de Storage y RLS.
5. **Storage:** RESUELTO. Se comprobó la existencia y estado activo de los buckets `project-images` y `event-images` en la base remota. Queda pendiente como deuda operativa la normalización de la tabla `supabase_migrations` en el CLI.

## 17. Protocolo para desarrolladores y agentes

### Antes de trabajar

1. Leer `AGENTS.md`.
2. Leer `docs/spec.md`.
3. Leer `docs/estado-proyecto.md`.
4. Revisar **Trabajo en progreso**.
5. Revisar rama actual, estado Git y últimos commits.
6. No asumir que la documentación histórica representa el código actual.

### Al comenzar una feature

Registrar en **Trabajo en progreso**:

- feature o tarea;
- responsable;
- rama;
- estado;
- archivos principales previstos.

### Durante la implementación

- Evitar tocar áreas asignadas a otra rama.
- Reutilizar helpers compartidos y no duplicar reglas de negocio.
- No modificar Prisma sin justificar y preparar la migración correspondiente.
- Preservar autenticación, rol, ownership y validaciones del servidor.
- No ampliar el alcance funcional sin actualizar primero `docs/spec.md` cuando corresponda.

### Al terminar

Actualizar:

- estado funcional;
- archivos relevantes;
- decisiones tomadas;
- deuda nueva, si existe;
- validaciones ejecutadas;
- commit de referencia;
- entrada en el historial de este documento.

Una feature no debe marcarse **COMPLETA** sólo porque el código compile. Deben verificarse backend, frontend, permisos, validaciones y estados correspondientes.

## 18. Limitaciones conocidas de esta fotografía

- No se verificó un deployment activo en producción ni su región de ejecución.
- Se verificó el estado remoto de migraciones Prisma (`_prisma_migrations` al día con `20260909020221_init`) y la existencia de los buckets de Storage (`project-images` y `event-images`). El historial de Supabase CLI permanece no normalizado.
- No se usaron credenciales reales para pruebas autenticadas de navegador.
- La auditoría representa exactamente el commit y rama indicados; cambios posteriores pueden volverla obsoleta.

## 19. Historial de actualizaciones

| Fecha | Commit | Cambio | Autor/Responsable |
|---|---|---|---|
| 2026-10-27 | `33b93c7` | Auditoría integral y creación inicial de `estado-proyecto.md` | — |
| 2026-10-27 | `afe9786` | Corrección P0: transaccionalidad Serializable integral y retry acotado de `P2034` en `acceptOfferAsCounterparty` | — |
| 2026-10-27 | `1043195` | Saneamiento P0 de inicialización de BD: eliminación de SQL obsoleto de Supabase, consolidación de Prisma Migrate como único camino canónico y actualización de `docs/DATABASE.md` y `README.md` | — |
| 2026-10-27 | Pendiente | Feature: Historial de fechas canceladas para músicos en el dashboard (agrupación de acuerdos en eventos cancelados y visualización dedicada) | — |
