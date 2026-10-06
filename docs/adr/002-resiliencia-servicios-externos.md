# ADR 002: Resiliencia y aislamiento de servicios externos (Clase 7 MDW)

- Estado: aceptado
- Fecha: 2026-10-06

## Contexto

Arma tu Pogo depende de servicios e infraestructura externa para su funcionamiento:
1. **Supabase Auth:** Identidad, login, registro, sesiones y emisión/validación de JWT.
2. **PostgreSQL administrado en Supabase:** Persistencia relacional de todas las entidades del modelo.
3. **Correo transaccional gestionado por Supabase Auth:** Entrega de correos de confirmación durante el registro.

Anteriormente, el SDK de Supabase Auth era consumido de forma directa en Server Actions y helpers de API sin aislamiento, sin timeouts explícitos y con riesgo de bloqueos indefinidos o comportamientos permisivos en el middleware ante variables faltantes.

## Decisión

Se aplican los principios de la Clase 7 de MDW sobre la arquitectura existente:

### 1. Clasificación
- **Supabase Auth:** Clasificado como **SERVICIO ESENCIAL**. Sin él, el sistema no puede autenticar ni autorizar operaciones.
- **PostgreSQL / Supabase:** Clasificado como **SERVICIO ESENCIAL** de persistencia.
- **Correo de confirmación:** Delegado íntegramente a Supabase Auth. Arma tu Pogo **no implementa cliente de correo propio**.
- **Supabase Storage:** **No implementado en el MVP actual**. Las imágenes se gestionan mediante URLs directas.

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

## Consecuencias

- Se garantiza fail-safe en todas las rutas privadas.
- El servidor de Next.js libera rápidamente peticiones colgadas al alcanzar el límite de 5 segundos.
- La aplicación no depende de la sintaxis ni de los códigos de error internos de Supabase Auth en su lógica de negocio.
- Se mantiene el alcance estricto del MVP sin agregar dependencias ni servicios adicionales.

