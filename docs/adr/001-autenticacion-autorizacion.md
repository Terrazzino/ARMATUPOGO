# ADR 001: Autenticación y autorización

- Estado: aceptado
- Fecha: 2026-10-05

## Contexto

Arma tu Pogo necesita aplicar autenticación y autorización de forma consistente en Route Handlers y Server Actions. El proyecto ya utiliza Supabase Auth para identidad y Prisma para sus datos de dominio. Existía además un mecanismo de desarrollo basado en `x-user-id` que permitía seleccionar un usuario sin demostrar su identidad.

## Decisión

Supabase Auth continúa siendo el único proveedor de identidad. Se aceptan dos mecanismos validados por Supabase:

- sesión mediante cookies de Supabase SSR;
- `Authorization: Bearer <access_token>` para las APIs.

Después de validar la identidad con Supabase se carga el perfil `Usuario` mediante Prisma. `Usuario.rol` es la fuente autoritativa para autorización; la metadata de Supabase no decide permisos.

Se elimina `x-user-id` como mecanismo de autenticación tanto en desarrollo como en producción. Una identidad válida de Supabase sin perfil Prisma se trata como una inconsistencia interna explícita, no como una sesión ausente.

La semántica HTTP es:

- `401`: no hay sesión o access token válido;
- `403`: la identidad es válida, pero su rol no permite la operación;
- `404`: el recurso no existe o no es accesible para ese usuario;
- `500`: error interno de autenticación, base de datos, configuración o infraestructura, sin detalles internos en la respuesta.

Para recursos privados se incluye el propietario o participante en el `where` de la consulta siempre que sea razonable. Por ejemplo, se consulta por `id` y `usuarioId` juntos. Así, un recurso ajeno produce el mismo `404` que uno inexistente y no revela su existencia.

RLS no se incorpora en esta etapa. La autorización se aplica en el servidor de la aplicación y debe compartirse entre Route Handlers y Server Actions.

## Alternativas consideradas

- Auth.js u otro proveedor: descartado porque duplicaría Supabase Auth y ampliaría innecesariamente la arquitectura.
- `x-user-id` para desarrollo: descartado porque permite suplantación y crea una diferencia insegura entre entornos.
- Roles desde metadata de Supabase: descartado porque el perfil Prisma ya es la fuente de dominio y evitar dos fuentes previene inconsistencias.
- Responder `403` ante ownership ajeno: descartado porque confirma que el recurso existe.
- Implementar RLS ahora: diferido para una etapa posterior; no reemplaza las comprobaciones del servidor de aplicación.

## Consecuencias

- Toda identidad se valida criptográficamente a través de Supabase.
- Los fallos internos dejan de presentarse como `401` y no exponen información sensible.
- Los permisos requieren cargar el perfil Prisma después de autenticar.
- Los endpoints existentes deben migrarse gradualmente a los helpers compartidos y a consultas con filtros de pertenencia.
- Las pruebas manuales de API necesitan una cookie de sesión o un access token real; ya no pueden usar `x-user-id`.
