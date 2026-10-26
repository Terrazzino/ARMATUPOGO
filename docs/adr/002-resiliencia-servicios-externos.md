# ADR 002: Resiliencia y aislamiento de servicios externos (Clase 7 MDW)

- Estado: aceptado
- Fecha: 2026-10-06
- Última actualización: 2026-10-26

## Contexto

Arma tu Pogo depende de servicios e infraestructura externa para su funcionamiento:
1. **Supabase Auth:** Identidad, login, registro, sesiones y emisión/validación de JWT.
2. **PostgreSQL administrado en Supabase:** Persistencia relacional de todas las entidades del modelo.
3. **Correo transaccional gestionado por Supabase Auth:** Entrega de correos de confirmación durante el registro.
4. **Supabase Storage:** Almacenamiento de imágenes públicas opcionales de proyectos musicales y flyers de eventos.

Anteriormente, el SDK de Supabase Auth era consumido de forma directa en Server Actions y helpers de API sin aislamiento, sin timeouts explícitos y con riesgo de bloqueos indefinidos o comportamientos permisivos en el middleware ante variables faltantes.

## Decisión

Se aplican los principios de la Clase 7 de MDW sobre la arquitectura existente:

### 1. Clasificación
- **Supabase Auth:** Clasificado como **SERVICIO ESENCIAL**. Sin él, el sistema no puede autenticar ni autorizar operaciones.
- **PostgreSQL / Supabase:** Clasificado como **SERVICIO ESENCIAL** de persistencia.
- **Correo de confirmación:** Delegado íntegramente a Supabase Auth. Arma tu Pogo **no implementa cliente de correo propio**.
- **Supabase Storage (decisión original del 06/10/2026):** No implementado; las imágenes se gestionaban mediante URLs directas.
- **Supabase Storage (primera enmienda del 26/10/2026):** Se incorporó al MVP para imágenes opcionales de proyectos musicales, manteniendo diferidos los demás recursos.
- **Supabase Storage (segunda enmienda del 26/10/2026):** Se amplía a flyers opcionales de eventos. Los avatares y otros banners permanecen diferidos. La trazabilidad de la decisión original y de la primera ampliación se conserva.
- **Clasificación de Storage:** Servicio de soporte opcional para el proyecto textual y esencial únicamente cuando la mutación solicitada incluye subir o reemplazar una imagen. Su indisponibilidad no bloquea altas o ediciones sin cambios de imagen.

### 2. Aislamiento
Se crea una capa de servicio desacoplada (`lib/services/auth-service.ts`) que encapsula la comunicación con Supabase Auth (`signUp`, `signIn`, `signOut`, `validateSession`). Las capas de negocio (Server Actions y Route Handlers) no interactúan directamente con tipos o mensajes del SDK de Supabase.

### 3. Timeout explícito
Se establece un timeout estricto de **5000 ms (5 segundos)** en las llamadas fetch hacia Supabase utilizando `AbortSignal.timeout(5000)` en `lib/supabase/server.ts`, `lib/supabase/client.ts` y `middleware.ts`. Ninguna llamada al proveedor externo puede quedar bloqueada indefinidamente.

### 4. Estrategia de fallo y seguridad
- **Rutas protegidas en middleware:** Si las variables de entorno de Supabase faltan o el servicio falla, las rutas protegidas (`/dashboard/*`) **nunca permiten bypass**; redirigen de inmediato y de forma segura a `/auth/login?error=config_missing` o `auth_unavailable`.
- **Diferenciación de errores:** 
  - Credenciales o sesiones inválidas devuelven `401 Unauthorized` o `ValidationError`.
  - Timeouts, errores de red y respuestas `5xx` de Supabase se normalizan a `503 Service Unavailable` (`ServiceUnavailableError`) o `500 Internal Server Error` según el contexto, sin exponer detalles internos al cliente.
- **Logging seguro:** Los fallos con Supabase Auth se registran con contexto seguro (operación, tipo de fallo, status) sin registrar jamás contraseñas, tokens, emails ni cookies.
- **Credenciales:** Administradas estrictamente mediante variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Se removieron valores fallback ficticios (`placeholder`) para garantizar detección temprana de configuraciones ausentes.

### 5. Arquitectura y seguridad de Storage

- Se utiliza un bucket público de lectura llamado `project-images`; las operaciones de escritura continúan protegidas por RLS.
- Las rutas siguen el patrón `<auth.uid()>/projects/<projectId>/<uuid-aleatorio>.<ext-detectada>`. No se confía en el nombre original ni se sobrescriben objetos existentes.
- Las Server Actions autentican al usuario, exigen rol `MUSICO`, verifican ownership en PostgreSQL y usan el cliente SSR con la sesión del usuario. No se incorpora una clave `service_role`.
- Las llamadas reutilizan el timeout de 5 segundos del cliente Supabase SSR; un timeout o error de red se traduce en indisponibilidad controlada y no continúa con la escritura en Prisma.
- La política `INSERT` de `storage.objects` exige una carpeta cuyo primer segmento coincida con `auth.uid()` y comprueba mediante una función booleana de privilegios mínimos que el `projectId` corresponda a una fila real de `public.proyectos_musicales` cuyo `user_id` sea el usuario autenticado. `DELETE` exige ownership del objeto. El `SELECT` requerido por `remove()` en Storage JS 2.112.4 se limita con `storage.allow_only_operation('storage.object.delete_many')`; no habilita listado ni descarga autenticada. No se concede `UPDATE`.
- El bucket limita archivos a 5 MiB y a `image/jpeg`, `image/png` e `image/webp`. La aplicación repite la validación en servidor y comprueba firma real, dimensiones y ausencia de animación antes de invocar Storage.
- PostgreSQL conserva únicamente la URL pública en `ProyectoMusical.imagenUrl`. No se agrega una tabla de archivos ni una migración Prisma.
- La migración `supabase/migrations/202610260002_project_images_storage.sql` prepara bucket y políticas, pero requiere autorización y aplicación remota separadas.
- Para eventos se utiliza `event-images` y rutas `<auth.uid()>/events/<eventId>/<uuid>.<ext>`. La RLS verifica la fila real en `public.eventos`, su `organizer_id` y el rol `ORGANIZADOR` de `public.usuarios`; no alcanza con una carpeta o UUID bien formados.
- Los flyers admiten JPG, PNG y WebP estáticos hasta 5 MiB, entre 400×500 y 4000×5000 píxeles y hasta 20 MP. La validación binaria compartida evita duplicar los parsers usados por proyectos.
- `supabase/migrations/202610260003_event_images_storage.sql` crea de forma segura el bucket y políticas `INSERT`, `DELETE` y `SELECT` mínimo para `remove()`, sin `UPDATE`; también requiere aplicación remota separada.

### 6. Consistencia y estrategia de fallos de Storage

- Crear con imagen: se persiste primero una fila provisional (`is_active = false`, `image_url = null`), se sube un objeto nuevo y único, y después una actualización única guarda la URL y activa el proyecto. Si falla Storage o la activación, se intenta compensar eliminando el objeto y la fila provisional.
- Reemplazar o quitar: el objeto anterior sólo se elimina después de que PostgreSQL confirme la nueva referencia o `null`, evitando URLs rotas.
- Si falla una limpieza posterior, la operación de negocio permanece confirmada y se devuelve una advertencia controlada; el resultado posible es un archivo huérfano recuperable, no la pérdida de la imagen referenciada.
- Si falla la validación o la carga, la mutación de negocio no se ejecuta. Los errores de proveedor se normalizan sin exponer credenciales, JWT, URLs de conexión ni respuestas internas.
- La imagen sigue siendo opcional: la indisponibilidad de Storage no impide crear o editar un proyecto cuando la operación no incluye cambios de imagen.
- En eventos existentes, conservar el flyer no consulta Storage. Reemplazar o quitar aplica la misma secuencia post-commit que proyectos: primero se confirma `bannerUrl` y luego se elimina el objeto anterior.
- La creación de eventos con flyer queda deliberadamente bloqueada: el esquema sólo permite `PUBLICADO` y `CANCELADO`, la especificación excluye borradores y la RLS exige un evento real antes del upload. Crear una fila pública incompleta o reutilizar `CANCELADO` sería inseguro. Crear sin imagen funciona normalmente y el flyer puede añadirse desde la edición; una solución atómica futura requiere una decisión de modelo explícita.

## Consecuencias

- Se garantiza fail-safe en todas las rutas privadas.
- El servidor de Next.js libera rápidamente peticiones colgadas al alcanzar el límite de 5 segundos.
- La aplicación no depende de la sintaxis ni de los códigos de error internos de Supabase Auth en su lógica de negocio.
- La ampliación de alcance queda limitada a imágenes de proyectos musicales y flyers de eventos, sin dependencias nuevas.
- La disponibilidad de carga y reemplazo depende de que el bucket y sus políticas hayan sido aplicados en el proyecto remoto.

