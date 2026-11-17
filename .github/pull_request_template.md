## Descripción del cambio
<!-- Resumen conciso de los cambios incluidos en este PR y su motivación -->

## Tipo de cambio
- [ ] Corrección de bug
- [ ] Nueva funcionalidad
- [ ] Refactor / Mejora de código
- [ ] Documentación / Infraestructura / CI

## Checklist de calidad
- [ ] **Especificación:** Cambio alineado con el alcance y reglas de `docs/spec.md`.
- [ ] **Seguridad:** Autenticación, autorización y validación de ownership revisadas en el servidor (si aplica).
- [ ] **Validación:** Esquemas Zod en servidor para cualquier dato entrante (si aplica).
- [ ] **Base de datos:** Migración documentada y reproducible si hubo cambios en Prisma/DB (si aplica).
- [ ] **Pruebas automatizadas:** Tests agregados o actualizados según corresponda.
  - [ ] TypeScript sin errores (`npx tsc --noEmit`).
  - [ ] ESLint aprobado (`npm run lint`).
  - [ ] Vitest aprobado (`npm test -- --run`).
  - [ ] Playwright E2E ejecutado (`npm run test:e2e`) si se afectó UI, navegación o integración.
- [ ] **Accesibilidad y UX:** Prueba manual responsive y navegación por teclado si se modificó UI.
- [ ] **Revisión por pares:** Aprobado por un integrante del equipo distinto al autor.
