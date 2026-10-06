# API — Arma tu pogo

> Este documento especifica el contrato de la API REST de Arma tu pogo.
>
> Toda la lógica sensible se ejecuta en servidor.
> Los errores están trazados a criterios de aceptación y casos de error de `docs/spec.md`.

---

## Prefijo

```
/api
```

---

## Convenciones

- Los métodos HTTP expresan la intención (`GET`, `POST`, `PATCH`, `DELETE`).
- Las operaciones de dominio que no se reducen a CRUD se expresan mediante subrecursos en español:
  - `/aceptar`, `/rechazar`, `/cancelar`, `/completar`
- Los IDs son UUIDs.
- Todos los endpoints privados requieren sesión válida de Supabase Auth.
- Los endpoints privados aceptan la cookie de Supabase SSR o `Authorization: Bearer <access_token>`.
- `x-user-id` no es un mecanismo de autenticación válido en ningún entorno.
- Toda mutación valida primero con Zod, luego verifica autorización, luego aplica reglas de dominio.

---

## Tabla de operaciones

### Usuarios

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/usuarios/me` | Devuelve el perfil del usuario autenticado | Cualquiera | 401 |
| `PATCH` | `/api/usuarios/me` | Actualiza datos editables del perfil: `nombre`, `apellido`, `biografia`, `telefono` | Cualquiera | 400, 401 |

> **Campos prohibidos en `PATCH /api/usuarios/me`:** si el cuerpo del request incluye `id`, `role`, `email`, contraseña, credenciales, tokens o secretos, el endpoint responde `400 Datos inválidos`. No se ignoran silenciosamente.

---

### Proyectos musicales

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/proyectos` | Lista los proyectos propios del músico | `MUSICO` | 401, 403 |
| `POST` | `/api/proyectos` | Crea un nuevo proyecto musical | `MUSICO` | 400, 401, 403 |
| `GET` | `/api/proyectos/buscar` | Busca exclusivamente proyectos activos | Público | — |
| `GET` | `/api/proyectos/:proyectoId` | Obtiene el detalle privado de un proyecto propio, activo o inactivo | `MUSICO` propietario | 401, 403, 404 |
| `PATCH` | `/api/proyectos/:proyectoId` | Actualiza un proyecto propio | `MUSICO` | 400, 401, 403, 404 |
| `DELETE` | `/api/proyectos/:proyectoId` | Desactiva un proyecto propio (baja lógica) | `MUSICO` | 401, 403, 404 |

Para las operaciones privadas, un proyecto ajeno y uno inexistente producen el mismo
`404`. La consulta incorpora simultáneamente el ID del proyecto y el ID del usuario
autenticado para no revelar la existencia de recursos de otro músico.

---

### Eventos

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/eventos` | Lista exclusivamente los eventos propios del organizador | `ORGANIZADOR` | 401, 403 |
| `POST` | `/api/eventos` | Publica un nuevo evento | `ORGANIZADOR` | 400, 401, 403 |
| `GET` | `/api/eventos/:eventoId` | Detalle privado de un evento propio, publicado o cancelado | `ORGANIZADOR` propietario | 401, 403, 404 |
| `PATCH` | `/api/eventos/:eventoId` | Actualiza un evento propio | `ORGANIZADOR` | 400, 401, 403, 404, 409 |
| `POST` | `/api/eventos/:eventoId/cancelar` | Cancela un evento propio y sus procesos activos | `ORGANIZADOR` | 401, 403, 404, 409 |

Los músicos consultan eventos mediante la API pública. En operaciones privadas,
un evento ajeno y uno inexistente producen `404`. `PATCH` no acepta `estado`; el único
flujo para pasar a `CANCELADO` es `/api/eventos/:eventoId/cancelar`.

---

### Postulaciones

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/eventos/:eventoId/postulaciones` | Lista las postulaciones recibidas en un evento propio | `ORGANIZADOR` | 401, 403, 404 |
| `POST` | `/api/eventos/:eventoId/postulaciones` | Postula un proyecto propio y activo al evento | `MUSICO` | 400, 401, 403, 404, 409 |
| `GET` | `/api/postulaciones` | Lista las postulaciones del usuario autenticado | Cualquiera | 401 |
| `GET` | `/api/postulaciones/:postulacionId` | Obtiene el detalle de una postulación | Autenticado | 401, 403, 404 |
| `POST` | `/api/postulaciones/:postulacionId/aceptar` | Acepta una postulación e inicia una contratación `NEGOCIANDO` | `ORGANIZADOR` | 401, 403, 404, 409 |
| `POST` | `/api/postulaciones/:postulacionId/rechazar` | Rechaza una postulación pendiente | `ORGANIZADOR` | 401, 403, 404, 409 |
| `POST` | `/api/postulaciones/:postulacionId/cancelacion` | Cancela una postulación propia en estado `PENDIENTE`. Responde `200 OK` con la postulación resultante (`CANCELADA`). | `MUSICO` | 401, 403, 404, 409 |

---

### Contrataciones

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/contrataciones` | Lista las contrataciones del usuario autenticado | Cualquiera | 401 |
| `POST` | `/api/contrataciones` | Inicia una contratación directa (selección directa del organizador) | `ORGANIZADOR` | 400, 401, 403, 404, 409 |
| `GET` | `/api/contrataciones/:contratacionId` | Obtiene el detalle de una contratación con historial de ofertas | Participante | 401, 403, 404 |
| `POST` | `/api/contrataciones/:contratacionId/cancelar` | Cancela una contratación `NEGOCIANDO` o `ACORDADO` (antes de que empiece el evento) | Participante | 400, 401, 403, 404, 409 |
| `POST` | `/api/contrataciones/:contratacionId/completar` | Marca la contratación `ACORDADO` como `COMPLETADO` después de `evento.ends_at` | Participante | 401, 403, 404, 409 |

---

### Ofertas

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `GET` | `/api/contrataciones/:contratacionId/ofertas` | Obtiene el historial de ofertas de una contratación | Participante | 401, 403, 404 |
| `POST` | `/api/contrataciones/:contratacionId/ofertas` | Envía una oferta o contraoferta | Participante | 400, 401, 403, 404, 409 |
| `POST` | `/api/ofertas/:ofertaId/aceptar` | Acepta la oferta vigente (`PROPUESTA`) y formaliza el acuerdo | Contraparte | 401, 403, 404, 409 |
| `POST` | `/api/ofertas/:ofertaId/rechazar` | Rechaza la oferta vigente (`PROPUESTA`) | Contraparte | 401, 403, 404, 409 |

---

### Valoraciones

| Método | Ruta | Qué hace | Rol | Errores posibles |
|---|---|---|---|---|
| `POST` | `/api/contrataciones/:contratacionId/valoraciones` | Crea una valoración de una contratación `COMPLETADO` | Participante | 400, 401, 403, 404, 409 |
| `GET` | `/api/contrataciones/:contratacionId/valoraciones` | Lista las valoraciones de una contratación | Participante | 401, 403, 404 |
| `GET` | `/api/usuarios/:usuarioId/valoraciones` | Consulta la reputación de un usuario | Según contexto | 404 |
| `GET` | `/api/proyectos/:proyectoId/valoraciones` | Consulta la reputación de un proyecto | Según contexto | 404 |

---

### API pública (sin autenticación)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/publico/eventos` | Cartelera pública: eventos con `estado = PUBLICADO` y `ends_at > ahora`. Incluye eventos en curso. |
| `GET` | `/api/publico/eventos/:eventoId` | Detalle público de un evento `PUBLICADO` con proyectos confirmados; `CANCELADO` devuelve 404 |
| `GET` | `/api/publico/proyectos/:proyectoId` | Perfil público de un proyecto musical activo |
| `GET` | `/api/proyectos/buscar` | Búsqueda pública de proyectos musicales activos |

Estos endpoints **nunca** devuelven: ofertas, negociaciones, postulaciones, datos privados, tokens ni credenciales.

---

## Los errores, en detalle

### Formato uniforme de error

Toda respuesta de error tiene la forma:

```json
{
  "error": "Mensaje comprensible para la persona"
}
```

### Errores de validación (Zod)

Cuando Zod rechaza los datos de entrada:

```json
{
  "error": "Datos inválidos",
  "detalles": {
    "campo": ["mensaje de error"]
  }
}
```

### Errores con información estructurada adicional

Cuando la spec justifica incluir datos adicionales que el frontend necesite procesar (no dentro del string `error`):

**Conflicto de disponibilidad del músico** (H6, H7, H9 — sec. 8):

```json
{
  "error": "El músico no está disponible en ese horario",
  "conflictos": [
    {
      "contratacionId": "uuid",
      "eventoTitulo": "...",
      "startsAt": "...",
      "endsAt": "..."
    }
  ]
}
```

**Sin cupos disponibles** (H9 — sec. 9):

```json
{
  "error": "El evento no tiene cupos disponibles",
  "cuposOcupados": 3,
  "cuposTotales": 3
}
```

---

## Catálogo de errores

### H1 — Registrar una cuenta

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| Registro | Campos obligatorios faltantes o formato inválido | `400` | "Datos inválidos" + detalles por campo | Zod |
| Registro | Contraseñas que no coinciden | `400` | "Las contraseñas no coinciden" | Zod |
| Registro | Rol inválido | `400` | "Debes seleccionar un rol válido" | Zod |
| Registro | Email ya registrado en Supabase | `409` | "El email ya se encuentra registrado" | regla de dominio |
| Registro | Error al crear perfil en base de datos | `500` | "No se pudo registrar el perfil" | catch del handler |

---

### H2 — Iniciar sesión

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| Login | Email o contraseña con formato inválido | `400` | "Datos inválidos" | Zod |
| Login | Credenciales incorrectas | `400` | "Email o contraseña incorrectos" | regla de dominio |
| Login | Email no confirmado en Supabase | `400` | "Tu email todavía no está confirmado" | regla de dominio |
| Cualquier endpoint privado | Sin sesión activa | `401` | "Autenticación requerida" | autorización/autenticación |
| Cualquier endpoint privado | Rol incorrecto para la operación | `403` | "No tienes permisos para esta acción" | autorización/autenticación |

---

### H3 — Proyectos musicales

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/proyectos` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/proyectos` | Rol `ORGANIZADOR` | `403` | "Solo los músicos pueden registrar proyectos" | autorización/autenticación |
| `POST /api/proyectos` | Campos inválidos (nombre, género) | `400` | "Datos inválidos" + detalles | Zod |
| `GET /api/proyectos/:id` | Rol `ORGANIZADOR` | `403` | "No tienes permisos para esta acción" | autorización |
| `GET /api/proyectos/:id` | Proyecto ajeno o inexistente | `404` | "Proyecto musical no encontrado" | consulta con ownership |
| `PATCH /api/proyectos/:id` | Proyecto ajeno o inexistente | `404` | "Proyecto musical no encontrado" | consulta con ownership |
| `DELETE /api/proyectos/:id` | Proyecto no existe | `404` | "Proyecto musical no encontrado" | consulta |
| `DELETE /api/proyectos/:id` | Proyecto de otro usuario | `404` | "Proyecto musical no encontrado" | consulta con ownership |
| `GET /api/publico/proyectos/:id` | Proyecto inactivo o inexistente | `404` | "Proyecto musical no encontrado" | consulta pública |

---

### H4 — Publicar y gestionar un evento

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/eventos` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/eventos` | Rol `MUSICO` | `403` | "Solo los organizadores pueden publicar eventos" | autorización/autenticación |
| `POST /api/eventos` | Campos obligatorios inválidos | `400` | "Datos inválidos" + detalles | Zod |
| `POST /api/eventos` | `ends_at` no posterior a `starts_at` | `400` | "La fecha de finalización debe ser posterior a la de inicio" | Zod o regla de dominio |
| `GET /api/eventos/:id` | Rol `MUSICO` | `403` | "No tienes permisos para esta acción" | autorización |
| `GET /api/eventos/:id` | Evento ajeno o inexistente | `404` | "Evento no encontrado" | consulta con ownership |
| `PATCH /api/eventos/:id` | Evento ajeno o inexistente | `404` | "Evento no encontrado" | consulta con ownership |
| `PATCH /api/eventos/:id` | Intenta establecer `estado` directamente | `400` | "Datos inválidos" | Zod |
| `PATCH /api/eventos/:id` | Intenta modificar fechas con contratos activos | `409` | "No se pueden modificar las fechas con contrataciones activas" | regla de dominio |
| `PATCH /api/eventos/:id` | Reduce cupos por debajo de los acordados | `409` | "No se pueden reducir los cupos por debajo de los ya acordados" | regla de dominio |
| `POST /api/eventos/:id/cancelar` | Evento no existe | `404` | "Evento no encontrado" | consulta |
| `POST /api/eventos/:id/cancelar` | Evento de otro organizador | `404` | "Evento no encontrado" | consulta con ownership |
| `POST /api/eventos/:id/cancelar` | Evento ya está `CANCELADO` | `409` | "El evento ya está cancelado" | regla de dominio |
| `POST /api/eventos/:id/cancelar` | Evento ya comenzó | `409` | "No se puede cancelar un evento que ya comenzó" | regla de dominio |
| `GET /api/publico/eventos/:id` | Evento cancelado o inexistente | `404` | "Evento no encontrado" | consulta pública |

---

### H5 — Postularse y cancelar una postulación

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/eventos/:id/postulaciones` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/eventos/:id/postulaciones` | Rol `ORGANIZADOR` | `403` | "Solo los músicos pueden postular proyectos" | autorización/autenticación |
| `POST /api/eventos/:id/postulaciones` | Proyecto no existe o no pertenece al usuario | `403` | "El proyecto musical no te pertenece" | autorización/autenticación |
| `POST /api/eventos/:id/postulaciones` | Proyecto inactivo | `409` | "El proyecto musical no está activo" | regla de dominio |
| `POST /api/eventos/:id/postulaciones` | Evento no existe | `404` | "Evento no encontrado" | consulta |
| `POST /api/eventos/:id/postulaciones` | Evento no está `PUBLICADO` | `409` | "El evento no está disponible para recibir postulaciones" | regla de dominio |
| `POST /api/eventos/:id/postulaciones` | Evento ya comenzó | `409` | "El evento ya no acepta postulaciones" | regla de dominio |
| `POST /api/eventos/:id/postulaciones` | Postulación duplicada (mismo proyecto y evento) | `409` | "Ya existe una postulación para este proyecto en este evento" | regla de dominio |
| `POST /api/postulaciones/:id/cancelacion` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/postulaciones/:id/cancelacion` | Postulación no existe o no pertenece al usuario | `403` | "No tienes permiso para cancelar esta postulación" | autorización/autenticación |
| `POST /api/postulaciones/:id/cancelacion` | Postulación no está en estado `PENDIENTE` | `409` | "La postulación ya no puede cancelarse" | regla de dominio |

---

### H6 — Aceptar una postulación

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/postulaciones/:id/aceptar` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/postulaciones/:id/aceptar` | Rol `MUSICO` | `403` | "Solo los organizadores pueden aceptar postulaciones" | autorización/autenticación |
| `POST /api/postulaciones/:id/aceptar` | Postulación no existe | `404` | "Postulación no encontrada" | consulta |
| `POST /api/postulaciones/:id/aceptar` | Postulación de otro organizador | `403` | "No puedes aceptar postulaciones de otro organizador" | autorización/autenticación |
| `POST /api/postulaciones/:id/aceptar` | Postulación no está `PENDIENTE` | `409` | "La postulación ya no está pendiente" | regla de dominio |
| `POST /api/postulaciones/:id/aceptar` | Evento no está `PUBLICADO` | `409` | "El evento ya no admite postulaciones" | regla de dominio |
| `POST /api/postulaciones/:id/aceptar` | Músico con contratación activa superpuesta | `409` | "El músico no está disponible en ese horario" | regla de dominio |
| `POST /api/postulaciones/:id/aceptar` | Contratación duplicada para este proyecto/evento | `409` | "Ya existe una contratación para este proyecto en este evento" | regla de dominio |
| `POST /api/postulaciones/:id/aceptar` | Modificación concurrente de la postulación | `409` | "La postulación ya fue procesada por otra operación" | regla de dominio |
| `POST /api/postulaciones/:id/rechazar` | Postulación no está `PENDIENTE` | `409` | "La postulación ya no puede rechazarse" | regla de dominio |

---

### H7 — Seleccionar directamente un proyecto

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/contrataciones` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/contrataciones` | Rol `MUSICO` | `403` | "Solo los organizadores pueden iniciar contrataciones directas" | autorización/autenticación |
| `POST /api/contrataciones` | Evento no existe o no pertenece al organizador | `403` | "El evento no te pertenece" | autorización/autenticación |
| `POST /api/contrataciones` | Proyecto no existe | `404` | "Proyecto musical no encontrado" | consulta |
| `POST /api/contrataciones` | Proyecto inactivo | `409` | "El proyecto musical no está activo" | regla de dominio |
| `POST /api/contrataciones` | Músico con contratación activa superpuesta | `409` | "El músico no está disponible en ese horario" | regla de dominio |
| `POST /api/contrataciones` | Ya existe postulación o contratación para este proyecto/evento | `409` | "Ya existe una postulación o contratación previa para este proyecto en este evento" | regla de dominio |

---

### H8 — Negociar el caché (ofertas y contraofertas)

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/contrataciones/:id/ofertas` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/contrataciones/:id/ofertas` | Usuario no es participante | `403` | "No tienes acceso a esta negociación" | autorización/autenticación |
| `POST /api/contrataciones/:id/ofertas` | Contratación no existe | `404` | "Contratación no encontrada" | consulta |
| `POST /api/contrataciones/:id/ofertas` | Monto negativo o fuera del rango | `400` | "Datos inválidos" | Zod |
| `POST /api/contrataciones/:id/ofertas` | Contratación no está `NEGOCIANDO` | `409` | "No se pueden enviar ofertas en una contratación cerrada" | regla de dominio |
| `POST /api/ofertas/:id/aceptar` | Oferta no existe | `404` | "Oferta no encontrada" | consulta |
| `POST /api/ofertas/:id/aceptar` | Usuario no es participante | `403` | "No formas parte de esta negociación" | autorización/autenticación |
| `POST /api/ofertas/:id/aceptar` | El emisor intenta aceptar su propia oferta | `409` | "No puedes aceptar tu propia oferta" | regla de dominio |
| `POST /api/ofertas/:id/aceptar` | Oferta no está `PROPUESTA` | `409` | "Esta oferta ya no está disponible" | regla de dominio |
| `POST /api/ofertas/:id/aceptar` | Contratación no está `NEGOCIANDO` | `409` | "La contratación ya no está en negociación" | regla de dominio |
| `POST /api/ofertas/:id/rechazar` | El emisor intenta rechazar su propia oferta | `409` | "No puedes rechazar tu propia oferta" | regla de dominio |
| `POST /api/ofertas/:id/rechazar` | Oferta no está `PROPUESTA` | `409` | "Solo se pueden rechazar ofertas vigentes" | regla de dominio |
| `POST /api/ofertas/:id/rechazar` | Contratación no está `NEGOCIANDO` | `409` | "No se pueden rechazar ofertas en una contratación cerrada" | regla de dominio |

---

### H9 — Registrar el acuerdo (aceptar oferta)

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/ofertas/:id/aceptar` | Músico con contratación activa superpuesta | `409` | "El músico no está disponible en ese horario" | regla de dominio |
| `POST /api/ofertas/:id/aceptar` | Evento sin cupos disponibles | `409` | "El evento no tiene cupos disponibles" | regla de dominio |
| `POST /api/ofertas/:id/aceptar` | Modificación concurrente del contrato | `409` | "La contratación ya fue acordada por otra operación" | regla de dominio |

---

### H10 — Cancelar una contratación

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/contrataciones/:id/cancelar` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/contrataciones/:id/cancelar` | Usuario no es participante | `403` | "No tienes permiso para cancelar esta contratación" | autorización/autenticación |
| `POST /api/contrataciones/:id/cancelar` | Contratación no existe | `404` | "Contratación no encontrada" | consulta |
| `POST /api/contrataciones/:id/cancelar` | Ya está `CANCELADO` | `409` | "La contratación ya está cancelada" | regla de dominio |
| `POST /api/contrataciones/:id/cancelar` | Ya está `COMPLETADO` | `409` | "La contratación ya está completada y no puede cancelarse" | regla de dominio |
| `POST /api/contrataciones/:id/cancelar` | `ACORDADO` y el evento ya comenzó | `409` | "No se puede cancelar una contratación acordada cuando el evento ya comenzó" | regla de dominio |
| `POST /api/contrataciones/:id/cancelar` | Motivo de cancelación inválido (longitud) | `400` | "Datos inválidos" | Zod |

---

### H11 — Completar una contratación

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/contrataciones/:id/completar` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/contrataciones/:id/completar` | Usuario no es participante | `403` | "No formas parte de esta contratación" | autorización/autenticación |
| `POST /api/contrataciones/:id/completar` | Contratación no existe | `404` | "Contratación no encontrada" | consulta |
| `POST /api/contrataciones/:id/completar` | Estado distinto de `ACORDADO` | `409` | "Solo se puede completar una contratación acordada" | regla de dominio |
| `POST /api/contrataciones/:id/completar` | El evento todavía no finalizó | `409` | "El evento todavía no finalizó" | regla de dominio |

---

### H12 — Valorar una contratación

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/contrataciones/:id/valoraciones` | Sin sesión | `401` | "Autenticación requerida" | autorización/autenticación |
| `POST /api/contrataciones/:id/valoraciones` | Usuario no es participante | `403` | "No participaste de esta contratación" | autorización/autenticación |
| `POST /api/contrataciones/:id/valoraciones` | Contratación no existe | `404` | "Contratación no encontrada" | consulta |
| `POST /api/contrataciones/:id/valoraciones` | Contratación no está `COMPLETADO` | `409` | "Solo se pueden valorar contrataciones completadas" | regla de dominio |
| `POST /api/contrataciones/:id/valoraciones` | El usuario ya valoró esta contratación | `409` | "Ya realizaste una valoración para esta contratación" | regla de dominio |
| `POST /api/contrataciones/:id/valoraciones` | Puntuación fuera del rango 1–5 o no entera | `400` | "Datos inválidos" | Zod |

---

### General

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| Cualquier endpoint | Error interno inesperado | `500` | "Error interno del servidor" | catch del handler |
| Cualquier endpoint con ID | UUID con formato inválido | `400` | "Datos inválidos" | Zod |

