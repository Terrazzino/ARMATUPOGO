# Especificación del sistema — Arma tu pogo

> Este documento constituye la fuente principal de requerimientos funcionales y reglas de negocio del proyecto.
>
> Se mantiene actualizado durante el desarrollo.
>
> **Regla práctica:** si una funcionalidad no está definida en este documento, no forma parte del MVP salvo que el equipo la acuerde y actualice previamente.

---

# 1. El problema

## Para quién

Arma tu pogo está dirigido a:

- músicos y proyectos musicales que buscan participar en eventos;
- organizadores que necesitan contratar artistas;
- público que busca información sobre eventos musicales.

## Situación actual

Actualmente, músicos y organizadores suelen encontrarse mediante redes sociales, contactos personales o publicaciones aisladas.

La información sobre:

- eventos disponibles;
- cachés;
- disponibilidad;
- negociaciones;
- antecedentes;
- reputación;

queda dispersa y no existe un espacio centralizado que facilite la contratación.

## Qué mejora Arma tu pogo

Arma tu pogo centraliza la oferta y demanda de músicos para eventos.

La plataforma permite:

- registrar proyectos musicales;
- publicar eventos;
- descubrir oportunidades;
- postular proyectos musicales;
- seleccionar artistas;
- negociar cachés mediante ofertas y contraofertas;
- registrar acuerdos;
- gestionar disponibilidad;
- construir reputación;
- consultar una cartelera pública de eventos.

---

# 2. Alcance del MVP

El MVP se concentrará en el núcleo del marketplace:

1. registro y autenticación de usuarios;
2. administración de perfiles;
3. administración de proyectos musicales;
4. publicación y búsqueda de eventos;
5. postulación de proyectos musicales;
6. selección directa de proyectos por parte de organizadores;
7. creación de contrataciones;
8. negociación mediante ofertas y contraofertas;
9. registro del acuerdo económico alcanzado;
10. gestión de disponibilidad de músicos;
11. cancelación y finalización de contrataciones;
12. valoración posterior de las partes;
13. consulta de reputación;
14. cartelera pública de eventos.

El MVP **no procesará pagos reales ni transferencias de dinero**.

El sistema solamente registrará:

- cachés aproximados;
- cachés ofrecidos;
- ofertas;
- contraofertas;
- monto finalmente acordado.

El pago efectivo se realizará por fuera de Arma tu pogo.

La venta real de entradas y mecanismos avanzados de monetización quedan fuera del procesamiento del MVP.

---

# 3. Roles

| Rol | Quién es | Funcionalidades principales |
|---|---|---|
| **Músico** | Persona que representa uno o varios proyectos musicales | Crear proyectos, administrarlos, buscar eventos, postular proyectos, negociar contrataciones y valorar organizadores |
| **Organizador** | Persona o entidad responsable de organizar eventos | Crear eventos, administrar eventos, consultar proyectos, recibir postulaciones, iniciar contrataciones, negociar y valorar proyectos |
| **Público** | Persona interesada en consultar eventos | Consultar cartelera, eventos, artistas participantes y enlaces públicos |

## Reglas de roles

- Un usuario autenticado posee un único rol dentro del MVP.
- Los roles permitidos son `MUSICO` y `ORGANIZADOR`.
- Una misma cuenta no puede utilizar ambos roles simultáneamente.
- El rol se selecciona durante el registro.
- El rol no puede modificarse posteriormente desde el perfil durante el MVP.
- El público no necesita una cuenta.

---

# 4. Autenticación e identidad

La autenticación se implementará utilizando **Supabase Auth**.

La aplicación no implementará endpoints propios para manejar contraseñas, login o generación de tokens.

## Registro

La aplicación deberá disponer de una vista de registro.

El usuario deberá proporcionar como mínimo:

- nombre;
- apellido;
- email;
- contraseña;
- confirmación de contraseña;
- rol.

El registro deberá:

1. validar los datos ingresados;
2. crear la identidad mediante Supabase Auth;
3. crear el perfil correspondiente dentro de la tabla `usuarios`;
4. utilizar el mismo UUID de Supabase Auth como identificador del usuario de la aplicación;
5. almacenar el rol en la base de datos de Arma tu pogo.

La contraseña nunca deberá almacenarse dentro de la tabla `usuarios`.

## Login

La aplicación deberá disponer de una vista de inicio de sesión utilizando email y contraseña.

Supabase Auth será responsable de:

- validar las credenciales;
- gestionar la sesión;
- emitir los tokens correspondientes;
- mantener la sesión utilizando el mecanismo SSR definido para Next.js.

## Logout

La aplicación deberá permitir cerrar la sesión mediante Supabase Auth.

No es necesario implementar un endpoint propio `/api/auth/logout`.

## Usuario de aplicación

El usuario autenticado de Supabase deberá relacionarse con una única fila de `usuarios`.

Conceptualmente:

```text
Supabase auth.users.id
        =
usuarios.id
```

## Datos que no pueden actualizarse mediante `/api/usuarios/me`

El endpoint de modificación del perfil no permitirá modificar directamente:

- `id`;
- `role`;
- contraseña;
- credenciales;
- tokens;
- secretos.

Los cambios de email, en caso de implementarse posteriormente, deberán realizarse mediante el mecanismo correspondiente de Supabase Auth y no mediante una modificación arbitraria de la tabla `usuarios`.

---

# 5. Entidades

## 5.1. Usuario

Representa a una persona autenticada.

Campos conceptuales principales:

- id;
- email;
- nombre;
- apellido;
- rol;
- avatar;
- biografía;
- teléfono;
- fechas de creación y modificación.

Se relaciona con:

- proyectos musicales;
- eventos;
- postulaciones;
- contrataciones;
- ofertas;
- valoraciones.

---

## 5.2. Proyecto Musical

Representa una banda, solista, dúo, tributo u otro proyecto artístico administrado por un músico.

Un músico puede administrar múltiples proyectos musicales.

Campos principales:

- id;
- propietario;
- nombre;
- descripción;
- género musical;
- caché aproximado;
- ubicación;
- ciudad;
- imagen;
- Spotify;
- YouTube;
- Instagram;
- sitio web;
- enlaces personalizados;
- estado activo;
- fechas de creación y modificación.

### Baja lógica

Los proyectos musicales no se eliminan físicamente cuando poseen historial asociado.

El endpoint de eliminación realizará una **baja lógica**:

```text
is_active = false
```

Un proyecto inactivo:

- no puede generar nuevas postulaciones;
- no puede recibir nuevas contrataciones directas;
- no aparece en búsquedas de proyectos disponibles;
- conserva sus contrataciones, valoraciones e historial existentes.

La información histórica necesaria podrá seguir siendo consultada cuando el proyecto participe de contrataciones o eventos anteriores.

---

## 5.3. Evento

Representa un recital o evento publicado por un organizador.

Campos principales:

- id;
- organizador;
- título;
- descripción;
- fecha y hora de inicio;
- fecha y hora de finalización;
- ubicación;
- nombre del establecimiento;
- ciudad;
- cantidad de proyectos requeridos;
- caché ofrecido;
- estado;
- banner;
- fechas de creación y modificación.

### Horarios

Un evento debe registrar:

```text
starts_at
ends_at
```

Debe cumplirse:

```text
ends_at > starts_at
```

Esto permite determinar correctamente la disponibilidad de los músicos.

### Estados

Durante el MVP, los estados persistidos del evento serán:

```text
PUBLICADO
CANCELADO
```

No es necesario persistir estados como:

```text
EN_CURSO
COMPLETADO
```

porque pueden inferirse utilizando las fechas.

Conceptualmente:

```text
ahora < starts_at
→ próximo

starts_at <= ahora < ends_at
→ en curso

ahora >= ends_at
→ finalizado
```

Los eventos se crean directamente como `PUBLICADO`.

El flujo de borradores queda fuera del MVP.

---

## 5.4. Postulación

Representa la solicitud de un proyecto musical para participar en un evento.

Campos conceptuales:

- id;
- evento;
- proyecto musical;
- músico propietario;
- estado;
- mensaje opcional;
- fecha de creación;
- fecha de modificación.

### Estados

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
```

### Reglas

Una postulación pendiente no constituye una contratación.

Un proyecto musical no puede generar postulaciones duplicadas para el mismo evento.

Deberá existir una restricción equivalente a:

```text
UNIQUE(event_id, musical_project_id)
```

El músico asociado a la postulación siempre deberá obtenerse desde el propietario real del proyecto.

Nunca se confiará en un `musician_id` arbitrario enviado por el cliente.

---

## 5.5. Contratación

Representa el proceso de negociación y posterior acuerdo entre:

- un evento;
- un proyecto musical;
- un músico;
- un organizador.

Campos principales:

- id;
- evento;
- proyecto musical;
- organizador;
- músico;
- postulación de origen opcional;
- estado;
- monto acordado;
- fecha del acuerdo;
- fecha de cancelación;
- motivo de cancelación;
- usuario que originó la contratación;
- fechas de creación y modificación.

### Relación opcional con Postulación

Una contratación puede surgir de:

1. una postulación aceptada;
2. una selección directa realizada por un organizador.

Cuando proviene de una postulación se recomienda registrar:

```text
postulation_id
```

Cuando fue iniciada directamente:

```text
postulation_id = null
```

Una misma postulación no puede generar múltiples contrataciones.

### Estados

```text
NEGOCIANDO
ACORDADO
CANCELADO
COMPLETADO
```

No se utilizarán los estados:

```text
PENDIENTE
RECHAZADO
```

dentro de Contratación.

Esos conceptos pertenecen a Postulación.

---

## 5.6. Oferta

Representa una propuesta económica realizada dentro de una contratación.

Campos principales:

- id;
- contratación;
- usuario emisor;
- monto;
- mensaje opcional;
- estado;
- fechas de creación y modificación.

### Estados

```text
PROPUESTA
ACEPTADA
RECHAZADA
CONTRAOFERTADA
```

Dentro de una contratación solamente puede existir una oferta vigente en estado `PROPUESTA`.

---

## 5.7. Valoración

Representa la evaluación realizada por una de las partes una vez completada una contratación.

Campos principales:

- id;
- contratación;
- autor;
- usuario valorado;
- proyecto valorado, cuando corresponda;
- puntuación;
- comentario;
- fechas de creación y modificación.

La puntuación deberá encontrarse dentro del rango:

```text
1 <= score <= 5
```

Deberá mantenerse la restricción:

```text
UNIQUE(contract_id, author_id)
```

para impedir que una misma parte valore dos veces la misma contratación.

---

## 5.8. Entrada

Representa información conceptual relacionada con entradas de un evento.

Puede contener:

- tipo;
- precio;
- capacidad;
- descripción;
- enlace externo de compra;
- indicación de entrada gratuita.

La entidad podrá permanecer preparada en el modelo.

Durante el MVP:

- Arma tu pogo no vende entradas;
- no procesa pagos;
- no gestiona compras;
- no necesita endpoints propios para Entrada.

---

# 6. Historias de usuario

## H1 — Registrar una cuenta

**Como** usuario, **quiero** registrarme indicando mis datos y rol, **para** utilizar las funcionalidades correspondientes.

### Criterios de aceptación

- [ ] El usuario puede elegir entre Músico y Organizador.
- [ ] El registro utiliza Supabase Auth.
- [ ] La identidad creada en Supabase se relaciona con el perfil local.
- [ ] No se almacena la contraseña en la tabla `usuarios`.
- [ ] El rol queda registrado y no puede modificarse posteriormente durante el MVP.
- [ ] No se permite utilizar funcionalidades privadas sin autenticación.
- [ ] Un usuario solamente puede utilizar funcionalidades correspondientes a su rol.
- [ ] Si el email ya existe o los datos son inválidos, se informa el error.

---

## H2 — Iniciar y cerrar sesión

**Como** usuario registrado, **quiero** iniciar y cerrar sesión, **para** acceder de forma segura a mis funcionalidades privadas.

### Criterios de aceptación

- [ ] Existe una vista de login.
- [ ] El login utiliza Supabase Auth.
- [ ] La sesión puede ser validada desde el servidor.
- [ ] Existe una acción para cerrar la sesión.
- [ ] Los endpoints protegidos no confían únicamente en datos enviados por el cliente.

---

## H3 — Registrar un proyecto musical

**Como** músico, **quiero** registrar uno o varios proyectos musicales, **para** ofrecerlos a organizadores.

### Criterios de aceptación

- [ ] Puede registrar nombre, descripción, género, caché aproximado y enlaces.
- [ ] Puede administrar más de un proyecto.
- [ ] Solamente el propietario puede modificar el proyecto.
- [ ] El proyecto activo puede aparecer en búsquedas.
- [ ] Un organizador puede consultar su información pública.
- [ ] Eliminar un proyecto produce una baja lógica.
- [ ] Un proyecto inactivo no puede generar nuevas oportunidades.

---

## H4 — Publicar un evento

**Como** organizador, **quiero** publicar un evento, **para** encontrar proyectos musicales que participen.

### Criterios de aceptación

El evento requiere como mínimo:

- [ ] nombre;
- [ ] fecha y hora de inicio;
- [ ] fecha y hora de finalización;
- [ ] ubicación;
- [ ] cantidad de proyectos musicales requeridos.

Opcionalmente puede indicar caché ofrecido y otra información pública.

Además:

- [ ] `ends_at` debe ser posterior a `starts_at`.
- [ ] El organizador puede consultar las postulaciones recibidas.
- [ ] El evento se crea como publicado.
- [ ] Solamente el propietario puede modificarlo o cancelarlo.

---

H5 — Buscar y postularse a un evento

### Criterios de aceptación

* [ ] El músico puede consultar eventos publicados.
* [ ] Puede seleccionar únicamente proyectos propios y activos.
* [ ] Puede enviar una postulación independiente por cada proyecto musical.
* [ ] Un mismo proyecto musical no puede postularse más de una vez al mismo evento.
* [ ] Un mismo músico puede postular distintos proyectos musicales propios al mismo evento.
* [ ] Cada proyecto postulado representa una alternativa independiente que el organizador puede evaluar.
* [ ] Una postulación inicialmente queda `PENDIENTE`.
* [ ] El organizador puede aceptar o rechazar cada postulación.
* [ ] Las postulaciones pendientes no reservan disponibilidad horaria del músico.
* [ ] La existencia de varias postulaciones del mismo músico para un evento no implica múltiples reservas ni múltiples contrataciones.

---

## H6 — Aceptar una postulación

**Como** organizador, **quiero** aceptar una de las postulaciones recibidas, **para** seleccionar el proyecto que mejor se adapte a mi evento e iniciar una negociación.

### Criterios de aceptación

Cuando una postulación pendiente es aceptada:

```text
Postulación seleccionada PENDIENTE
        ↓
validar disponibilidad del músico
        ↓
Postulación seleccionada ACEPTADA
        +
otras postulaciones PENDIENTES
del mismo músico para el mismo evento
        ↓
CANCELADAS
        +
Contratación NEGOCIANDO
```

Además:

* [ ] aceptar una postulación no constituye todavía un acuerdo económico;
* [ ] aceptar una postulación no ocupa un cupo del evento;
* [ ] se crea una única contratación para el proyecto seleccionado;
* [ ] solamente el organizador propietario del evento puede aceptar una postulación;
* [ ] no puede aceptarse una postulación si genera un conflicto de disponibilidad del músico;
* [ ] cuando se acepta una postulación, todas las demás postulaciones `PENDIENTES` pertenecientes al mismo músico para ese mismo evento pasan automáticamente a `CANCELADA`;
* [ ] las postulaciones de ese músico correspondientes a otros eventos no se modifican;
* [ ] rechazar una postulación no afecta las demás postulaciones del mismo músico;
* [ ] las postulaciones canceladas automáticamente no se reactivan si posteriormente se cancela la contratación generada;
* [ ] toda la operación debe realizarse de forma atómica.

---

## H7 — Seleccionar directamente un proyecto

**Como** organizador, **quiero** seleccionar un proyecto musical, **para** iniciar directamente una negociación.

### Criterios de aceptación

- [ ] El organizador puede consultar proyectos activos.
- [ ] Puede seleccionar un proyecto para uno de sus eventos.
- [ ] Se valida la disponibilidad del músico.
- [ ] Se crea una contratación `NEGOCIANDO`.
- [ ] La contratación queda asociada al evento y proyecto correspondientes.
- [ ] La operación no ocupa todavía un cupo.
- [ ] No se puede iniciar una contratación con un proyecto inactivo.

---

## H8 — Negociar el caché

**Como** músico u organizador, **quiero** realizar ofertas y contraofertas, **para** acordar el monto de la contratación.

### Criterios de aceptación

- [ ] Cualquiera de las partes puede enviar la primera oferta.
- [ ] La contraparte puede aceptar, rechazar o contraofertar.
- [ ] Todas las ofertas quedan registradas.
- [ ] Solamente una oferta puede estar vigente como `PROPUESTA`.
- [ ] Una contraoferta convierte la propuesta anterior en `CONTRAOFERTADA`.
- [ ] El usuario que creó una oferta no puede aceptarla ni rechazarla.
- [ ] Una negociación cerrada no acepta nuevas ofertas.

---

## H9 — Registrar el acuerdo

**Como** músico u organizador, **quiero** consultar el acuerdo alcanzado, **para** conocer las condiciones pactadas.

### Criterios de aceptación

Cuando una oferta es aceptada:

```text
Oferta PROPUESTA
        ↓
ACEPTADA

Contratación NEGOCIANDO
        ↓
ACORDADO
```

Además:

- [ ] se registra `agreed_amount`;
- [ ] se registra `agreed_at`;
- [ ] el monto acordado no puede modificarse unilateralmente;
- [ ] antes de cerrar el acuerdo se valida nuevamente disponibilidad;
- [ ] antes de cerrar el acuerdo se valida el cupo del evento;
- [ ] el acuerdo es visible para ambas partes;
- [ ] nuevas ofertas quedan deshabilitadas.

---

## H10 — Cancelar una contratación

**Como** músico u organizador, **quiero** cancelar una contratación cuando corresponda, **para** finalizar una negociación o acuerdo que no continuará.

### Criterios de aceptación

Puede cancelarse una contratación:

- [ ] en estado `NEGOCIANDO`;
- [ ] en estado `ACORDADO` mientras el evento aún no haya comenzado.

No puede cancelarse:

- [ ] una contratación `COMPLETADA`;
- [ ] una contratación ya `CANCELADA`.

Al cancelar:

- [ ] cambia a `CANCELADO`;
- [ ] se registra `cancelled_at`;
- [ ] puede registrarse `cancellation_reason`;
- [ ] deja de bloquear disponibilidad;
- [ ] deja de ocupar cupo si estaba acordada;
- [ ] sus ofertas permanecen como historial pero no pueden modificarse.

---

## H11 — Completar una contratación

**Como** músico u organizador, **quiero** marcar una contratación como completada después del evento, **para** cerrar formalmente la participación.

### Criterios de aceptación

Puede completarse cuando:

```text
Contratación = ACORDADO
y
evento.ends_at <= ahora
```

Entonces:

```text
ACORDADO
    ↓
COMPLETADO
```

Además:

- [ ] cualquiera de las dos partes puede completar la contratación;
- [ ] solamente puede completarse una vez;
- [ ] una contratación completada conserva el monto acordado;
- [ ] una contratación completada no puede cancelarse;
- [ ] completar habilita las valoraciones.

---

## H12 — Valorar una contratación

**Como** músico, **quiero** valorar al organizador después de una participación completada.

**Como** organizador, **quiero** valorar al proyecto musical después de una participación completada.

### Criterios de aceptación

- [ ] La contratación debe estar `COMPLETADA`.
- [ ] Solamente los participantes pueden valorar.
- [ ] Una misma parte no puede valorar dos veces la misma contratación.
- [ ] La puntuación debe estar entre 1 y 5.
- [ ] El servidor determina automáticamente quién es el destinatario.
- [ ] El cliente no puede elegir arbitrariamente a quién valorar.
- [ ] La valoración queda asociada a la contratación.

---

## H13 — Consultar reputación

**Como** músico u organizador, **quiero** consultar la reputación de la otra parte, **para** decidir si quiero trabajar con ella.

### Criterios de aceptación

- [ ] Puede consultarse el promedio de puntuaciones.
- [ ] Puede consultarse la cantidad de valoraciones.
- [ ] Pueden consultarse las valoraciones anteriores según el nivel de detalle definido para el MVP.
- [ ] No existen valoraciones sin contratación.
- [ ] El organizador puede generar reputación para el proyecto musical valorado.
- [ ] El músico puede generar reputación para el organizador.

---

## H14 — Consultar cartelera pública

**Como** público, **quiero** consultar eventos, **para** conocer recitales disponibles.

### Criterios de aceptación

- [ ] No requiere autenticación.
- [ ] Solamente muestra eventos publicados y vigentes.
- [ ] No muestra eventos cancelados.
- [ ] Los eventos que ya finalizaron no aparecen en la cartelera principal.
- [ ] Puede consultarse información pública del evento.
- [ ] Pueden consultarse proyectos con participación acordada.
- [ ] Pueden consultarse redes y plataformas musicales.
- [ ] Nunca se exponen negociaciones, ofertas o datos privados.

---

# 7. Flujo principal

El recorrido principal del sistema será:

1. Un usuario se registra mediante Supabase Auth.
2. Selecciona rol Músico u Organizador.
3. Se crea su perfil de Arma tu pogo.
4. El músico registra uno o varios proyectos musicales.
5. El organizador crea y publica un evento.
6. El músico encuentra el evento y envía una postulación.

Alternativamente:

6. El organizador encuentra directamente un proyecto musical.

### Desde una postulación

7. El organizador acepta la postulación.
8. Se valida la disponibilidad del músico.
9. Se crea una contratación `NEGOCIANDO`.

### Desde selección directa

7. El organizador inicia una contratación.
8. Se valida la disponibilidad del músico.
9. Se crea una contratación `NEGOCIANDO`.

### Negociación

10. Una de las partes envía una oferta.
11. La otra puede aceptar, rechazar o contraofertar.
12. El historial completo queda almacenado.
13. Antes de aceptar definitivamente se valida:
    - disponibilidad del músico;
    - cupo del evento.
14. La oferta aceptada establece el monto definitivo.
15. La contratación pasa a `ACORDADO`.
16. El proyecto ocupa un cupo.

### Finalización

17. El evento se realiza.
18. Después de `ends_at`, la contratación puede marcarse `COMPLETADO`.
19. Ambas partes pueden valorarse.
20. Las valoraciones forman parte de la reputación futura.

Paralelamente, el público puede consultar la cartelera.

---

# 8. Reglas de disponibilidad del músico

La disponibilidad se determina a nivel del **usuario con rol Músico**, no a nivel del proyecto musical.

Esto significa que un músico con varios proyectos no puede utilizar proyectos diferentes para asumir compromisos simultáneos.

Ejemplo:

```text
Músico
├── Proyecto A
└── Proyecto B
```

Si Proyecto A posee una contratación activa:

```text
Evento A
20:00 → 23:00
```

no puede iniciarse otra contratación activa para Proyecto B:

```text
Evento B
21:00 → 00:00
```

porque existe superposición.

## Contrataciones que bloquean disponibilidad

Bloquean:

```text
NEGOCIANDO
ACORDADO
```

No bloquean:

```text
CANCELADO
```

`COMPLETADO` representa una participación pasada y no afecta eventos futuros.

## Postulaciones

Las postulaciones `PENDIENTES` **no bloquean disponibilidad**.

Un músico puede tener:

```text
Evento A 21:00–23:00 → PENDIENTE
Evento B 21:30–23:30 → PENDIENTE
```

Esto es válido porque todavía no existe ningún compromiso.

El conflicto se valida cuando una postulación intenta ser aceptada.

## Superposición

Dos eventos se consideran incompatibles cuando sus intervalos horarios se superponen.

Conceptualmente existe conflicto cuando:

```text
nuevoInicio < existenteFin
y
nuevoFin > existenteInicio
```

Por lo tanto:

```text
Evento A 18:00 → 20:00
Evento B 20:00 → 22:00
```

son compatibles.

## Mismo día con horarios diferentes

Un músico puede participar en múltiples eventos durante el mismo día mientras los horarios no se superpongan.

Ejemplo válido:

```text
Evento A
12:00 → 15:00

Evento B
21:00 → 23:30
```

## Tiempo de traslado

El MVP no calcula:

- distancia;
- tiempo de traslado;
- prueba de sonido;
- armado;
- logística.

Solamente se considera la superposición real de intervalos horarios.

---

# 9. Reglas de cupos

Cada evento posee:

```text
required_projects_count
```

que indica cuántos proyectos musicales puede incorporar.

## Ocupan cupo

```text
ACORDADO
COMPLETADO
```

## No ocupan cupo

```text
Postulación PENDIENTE
Postulación ACEPTADA
Contratación NEGOCIANDO
Contratación CANCELADO
```

Ejemplo:

```text
Evento
required_projects_count = 3

ACORDADO = 2
NEGOCIANDO = 5

cupos ocupados = 2
cupos disponibles = 1
```

Puede existir cualquier cantidad razonable de negociaciones mientras todavía haya capacidad para cerrar acuerdos.

## Validación definitiva

El cupo debe comprobarse nuevamente al aceptar una oferta.

No podrá aceptarse una oferta si la operación provocaría:

```text
contrataciones acordadas > required_projects_count
```

La aceptación de la oferta y el cambio de estado deberán realizarse de manera atómica.

---

# 10. Reglas de Postulación

* Solamente un usuario `MUSICO` puede crear postulaciones.
* Solamente puede postular proyectos musicales propios.
* El proyecto debe encontrarse activo.
* El evento debe encontrarse `PUBLICADO`.
* El evento no debe haber comenzado.
* Una nueva postulación queda en estado `PENDIENTE`.

## Múltiples proyectos del mismo músico

Un músico puede administrar varios proyectos musicales y puede postular distintos proyectos propios al mismo evento.

Ejemplo válido:

```text
Evento X

Músico A
├── Proyecto Rock      → PENDIENTE
├── Proyecto Acústico  → PENDIENTE
└── Proyecto Tributo   → PENDIENTE
```

Cada proyecto constituye una alternativa independiente para el organizador.

El mismo proyecto musical no puede generar más de una postulación para el mismo evento.

Debe existir una restricción equivalente a:

```text
UNIQUE(event_id, musical_project_id)
```

No debe existir una restricción:

```text
UNIQUE(event_id, musician_id)
```

porque un mismo músico puede presentar varios proyectos diferentes al mismo evento.

## Postulaciones y disponibilidad

Las postulaciones `PENDIENTES` no reservan disponibilidad.

Un músico puede mantener postulaciones pendientes para distintos eventos cuyos horarios se superpongan.

La disponibilidad se valida cuando una postulación intenta convertirse en una contratación activa.

## Aceptación

Cuando el organizador acepta una postulación:

1. se verifica que continúe en estado `PENDIENTE`;
2. se obtiene el músico propietario del proyecto;
3. se valida su disponibilidad horaria;
4. la postulación seleccionada pasa a `ACEPTADA`;
5. todas las demás postulaciones `PENDIENTES` del mismo músico para ese mismo evento pasan a `CANCELADA`;
6. se crea una contratación `NEGOCIANDO` para el proyecto seleccionado.

Conceptualmente:

```text
Proyecto A → PENDIENTE
Proyecto B → PENDIENTE
Proyecto C → PENDIENTE

Organizador acepta Proyecto B

Proyecto A → CANCELADA
Proyecto B → ACEPTADA
Proyecto C → CANCELADA

Contratación Proyecto B → NEGOCIANDO
```

La aceptación completa debe realizarse dentro de una misma transacción.

## Rechazo

Rechazar una postulación solamente afecta a esa postulación:

```text
Proyecto A → RECHAZADA
Proyecto B → PENDIENTE
Proyecto C → PENDIENTE
```

Las demás alternativas continúan disponibles para que el organizador las evalúe.

## Cancelación automática

Las postulaciones que pasan automáticamente a `CANCELADA` debido a la aceptación de otro proyecto del mismo músico no se reactivan posteriormente.

Si la contratación generada termina siendo cancelada y el organizador desea negociar con otro proyecto de ese músico, podrá utilizar el flujo de contratación directa definido en el MVP.

## Cancelación del evento

Cuando un evento es cancelado:

```text
Postulaciones PENDIENTES
→ CANCELADAS
```

Las postulaciones que ya estén `ACEPTADAS`, `RECHAZADAS` o `CANCELADAS` conservan su historial.

---

# 11. Reglas de Contratación

Una contratación puede originarse mediante:

```text
Postulación aceptada
```

o:

```text
Selección directa del organizador
```

Toda contratación deberá registrar:

- evento;
- proyecto;
- organizador;
- músico;
- estado;
- origen;
- usuario creador;
- datos económicos cuando corresponda.

## Identidades

`organizer_id` deberá obtenerse desde el propietario del evento.

`musician_id` deberá obtenerse desde el propietario del proyecto.

Nunca deberán confiarse estos identificadores cuando sean proporcionados arbitrariamente por el cliente.

## Duplicados

Un mismo proyecto no puede mantener múltiples contrataciones equivalentes para el mismo evento.

## Disponibilidad

No puede crearse una contratación `NEGOCIANDO` si genera una superposición con otra contratación activa del mismo músico.

---

# 12. Reglas de Oferta

Toda oferta pertenece a una contratación.

Solo los participantes de la contratación pueden interactuar con sus ofertas.

## Crear oferta

Solamente puede realizarse cuando:

```text
Contratación = NEGOCIANDO
```

Una nueva oferta queda:

```text
PROPUESTA
```

## Oferta vigente

Dentro de una contratación solamente puede existir una propuesta vigente.

Si existe una propuesta de la contraparte y se envía una contraoferta:

```text
Oferta anterior:
PROPUESTA → CONTRAOFERTADA

Nueva oferta:
→ PROPUESTA
```

## Aceptar

Solamente la contraparte puede aceptar.

Debe cumplirse:

```text
oferta.status = PROPUESTA
contratacion.status = NEGOCIANDO
```

Antes de aceptar deben volver a validarse:

1. disponibilidad del músico;
2. cupo del evento.

Si todo es válido:

```text
Oferta → ACEPTADA
Contratación → ACORDADO
agreed_amount = Oferta.amount
agreed_at = ahora
```

## Rechazar

Solamente la contraparte puede rechazar una oferta vigente.

```text
PROPUESTA → RECHAZADA
```

La contratación permanece `NEGOCIANDO`.

Posteriormente cualquiera de las partes podrá iniciar una nueva propuesta válida.

## Restricción del emisor

El usuario que creó una oferta no puede:

- aceptar su propia oferta;
- rechazar su propia oferta;
- responder a su propia oferta como contraparte.

---

# 13. Cancelación de eventos

Solamente el organizador propietario puede cancelar su evento.

El evento debe encontrarse `PUBLICADO` y no debe haber comenzado.

Al cancelar:

```text
Evento
PUBLICADO → CANCELADO
```

Además, dentro de una misma operación consistente:

```text
Postulaciones PENDIENTES
→ CANCELADAS
```

```text
Contrataciones NEGOCIANDO
→ CANCELADAS
```

```text
Contrataciones ACORDADAS
→ CANCELADAS
```

Las ofertas y registros históricos no se eliminan.

Las contrataciones canceladas:

- dejan de bloquear disponibilidad;
- dejan de ocupar cupos;
- no admiten nuevas ofertas;
- no pueden completarse;
- no pueden generar valoraciones.

---

# 14. Modificación de eventos

Solamente el organizador propietario puede modificar un evento.

No podrán modificarse arbitrariamente datos que invaliden contrataciones existentes.

## Fecha y horario

Si existen contrataciones:

```text
NEGOCIANDO
o
ACORDADO
```

no podrá modificarse directamente:

```text
starts_at
ends_at
```

porque podría invalidar la disponibilidad previamente comprobada.

## Cantidad de proyectos

`required_projects_count` nunca podrá reducirse por debajo de la cantidad de contrataciones que actualmente ocupan cupo.

Debe cumplirse:

```text
required_projects_count >= cuposOcupados
```

## Caché ofrecido

Modificar el caché ofrecido del evento no modifica montos previamente acordados.

---

# 15. Cancelación de contrataciones

Una contratación puede ser cancelada por cualquiera de sus dos participantes.

## Permitido

```text
NEGOCIANDO → CANCELADO
```

También:

```text
ACORDADO → CANCELADO
```

siempre que:

```text
ahora < evento.starts_at
```

## No permitido

```text
COMPLETADO → CANCELADO
```

```text
CANCELADO → CANCELADO
```

Al cancelar se registra:

- `cancelled_at`;
- `cancellation_reason`, cuando corresponda.

---

# 16. Finalización de contrataciones

Una contratación solamente puede completarse si:

```text
status = ACORDADO
```

y:

```text
evento.ends_at <= ahora
```

Entonces:

```text
ACORDADO → COMPLETADO
```

La operación puede ser realizada por el músico o el organizador participantes.

Una contratación completada:

- conserva el monto acordado;
- conserva el historial;
- no puede cancelarse;
- habilita valoraciones.

---

# 17. Reglas de Valoración y reputación

Una valoración solamente puede crearse cuando:

```text
Contratación = COMPLETADO
```

## Músico valora organizador

El servidor determina:

```text
author = músico
target = organizador
target_project = null
```

## Organizador valora proyecto

El servidor determina:

```text
author = organizador
target = músico propietario
target_project = proyecto
```

El cliente solamente proporciona información como:

```json
{
  "score": 5,
  "comment": "Excelente experiencia"
}
```

No podrá decidir arbitrariamente:

- `author_id`;
- `target_id`;
- `target_project_id`.

## Reputación

La reputación podrá calcular:

- promedio de puntuación;
- cantidad de valoraciones;
- listado de valoraciones.

El promedio no necesita persistirse necesariamente si puede calcularse correctamente a partir de las valoraciones existentes.

---

# 18. Información pública

La información pública debe encontrarse claramente separada de la información privada.

## Información pública de Evento

Puede incluir:

- título;
- descripción;
- fecha y hora;
- ubicación;
- establecimiento;
- ciudad;
- banner;
- proyectos confirmados;
- información pública relacionada.

## Información pública de Proyecto

Puede incluir:

- nombre;
- descripción;
- género;
- imagen;
- ubicación;
- ciudad;
- caché aproximado cuando corresponda;
- Spotify;
- YouTube;
- Instagram;
- sitio web;
- enlaces personalizados;
- reputación pública.

## Información que nunca debe exponerse públicamente

- sesiones;
- tokens;
- credenciales;
- teléfono privado;
- negociaciones;
- historial de ofertas;
- postulaciones;
- motivos privados de cancelación;
- variables de entorno;
- información interna no definida como pública.

---

# 19. Reglas de negocio generales

- Un usuario tiene un único rol.
- Un músico puede administrar múltiples proyectos.
- Un proyecto pertenece a un músico.
- Un organizador puede publicar múltiples eventos.
- Un evento pertenece a un organizador.
- Un evento puede contratar múltiples proyectos.
- Los proyectos y eventos se relacionan mediante contrataciones.
- Toda negociación pertenece a una contratación.
- Toda oferta registra autor, monto y fecha.
- El historial de ofertas nunca se elimina al contraofertar.
- El monto acordado es definitivo.
- Cambiar el caché aproximado de un proyecto no modifica acuerdos existentes.
- Cambiar el caché ofrecido de un evento no modifica acuerdos existentes.
- Arma tu pogo no procesa dinero real.
- Solamente los participantes pueden acceder a una negociación.
- Solamente los participantes pueden valorar.
- Cada participante puede valorar una vez por contratación.
- Un evento no puede superar sus cupos.
- Una contratación cerrada no puede seguir negociándose.
- El público puede consultar información pública sin registrarse.
- Los datos privados no deben exponerse mediante endpoints públicos.
- La disponibilidad del músico se determina por intervalos horarios.
- Los diferentes proyectos de un mismo músico comparten disponibilidad.
- Las postulaciones pendientes no reservan disponibilidad.
- Las contrataciones en negociación sí reservan disponibilidad.
- Una contratación acordada ocupa cupo.
- Una contratación cancelada libera disponibilidad y cupo.
- Las reglas de autorización deben verificarse siempre en el servidor.

---

# 20. Requisitos no funcionales

## Usabilidad

- [ ] Los principales flujos deben ser comprensibles sin capacitación.
- [ ] Los formularios conservan los datos cuando existe un error de validación.
- [ ] Se utilizarán React Hook Form y Zod cuando corresponda.
- [ ] Los estados deben mostrarse claramente.
- [ ] La negociación debe mostrar oferta vigente e historial.
- [ ] La aplicación debe ser responsive.
- [ ] Debe funcionar correctamente en celular, tablet y desktop.

## Accesibilidad

- [ ] La interfaz puede operarse mediante teclado.
- [ ] El foco debe ser visible.
- [ ] Los inputs poseen `label`.
- [ ] Las imágenes informativas poseen texto alternativo.
- [ ] Las imágenes decorativas poseen texto alternativo vacío.
- [ ] El contraste debe ser suficiente.
- [ ] Los errores nunca se comunican solamente mediante color.

## Seguridad

- [ ] Los endpoints privados requieren autenticación.
- [ ] La sesión se valida en el servidor mediante Supabase.
- [ ] Los roles se verifican en el servidor.
- [ ] El ownership se verifica en el servidor.
- [ ] El cliente no puede asignarse IDs de recursos que no le pertenecen.
- [ ] Los datos de entrada se validan mediante Zod.
- [ ] Prisma es responsable del acceso a PostgreSQL.
- [ ] Las operaciones sensibles utilizan transacciones cuando corresponda.
- [ ] Las credenciales no se almacenan en el repositorio.
- [ ] Los secretos se gestionan mediante variables de entorno.
- [ ] Los endpoints públicos no exponen información privada.

---

# 21. Integraciones y tecnologías Core

## Next.js

La aplicación utilizará Next.js como framework web.

Se utilizarán Route Handlers y/o Server Actions según corresponda a la arquitectura acordada.

Las reglas de negocio siempre deben verificarse en servidor.

## Prisma ORM

Prisma será la capa principal de acceso a datos.

Responsabilidades:

- modelado;
- consultas;
- relaciones;
- constraints;
- transacciones;
- acceso tipado a PostgreSQL.

## PostgreSQL / Supabase

PostgreSQL será la base de datos relacional.

Supabase proveerá la infraestructura correspondiente.

## Supabase Auth

Responsable de:

- registro;
- login;
- sesiones;
- tokens;
- identidad.

## Supabase Storage

Podrá utilizarse para:

- avatares;
- imágenes de proyectos;
- banners.

## Zod

Se utilizará para validación tanto en frontend como especialmente en servidor.

## React Hook Form

Se utilizará para gestionar formularios cuando corresponda.

## Vercel

Plataforma prevista para el despliegue de la aplicación Next.js.

## GitHub

Repositorio y control de versiones.

---

# 22. Fuera de alcance

No forman parte del MVP:

- pagos reales;
- transferencias;
- Mercado Pago;
- Stripe;
- integración bancaria;
- billetera interna;
- saldo;
- facturación;
- comprobantes fiscales;
- venta real de entradas;
- procesamiento de compra de entradas;
- aplicación móvil nativa;
- chat general;
- integración automática con Spotify;
- integración automática con YouTube;
- integración automática con Instagram;
- verificación externa de identidad;
- antecedentes;
- inteligencia artificial;
- recomendaciones avanzadas;
- gestión de catering;
- iluminación;
- sonido;
- logística de producción;
- merchandising;
- gestión contable;
- publicidad automatizada;
- múltiples roles simultáneos;
- gestión individual de integrantes de bandas;
- cálculo de tiempos de traslado entre eventos;
- borradores de eventos.

---

# 23. Endpoints de la API

La API utiliza el prefijo:

```text
/api
```

Todos los endpoints privados deben validar:

1. sesión;
2. usuario;
3. rol;
4. ownership;
5. relación con el recurso;
6. reglas de negocio;
7. datos mediante Zod.

---

## 23.1. Usuarios

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/usuarios/me` | Obtener perfil del usuario autenticado | Sí |
| `PATCH` | `/api/usuarios/me` | Modificar datos editables del perfil | Sí |

No existen endpoints propios de registro y login porque esas operaciones utilizan Supabase Auth.

---

## 23.2. Proyectos musicales

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/proyectos` | Obtener proyectos propios | Sí |
| `POST` | `/api/proyectos` | Crear proyecto | Sí |
| `GET` | `/api/proyectos/buscar` | Buscar proyectos activos | Sí |
| `GET` | `/api/proyectos/:proyectoId` | Obtener detalle | Según contexto |
| `PATCH` | `/api/proyectos/:proyectoId` | Actualizar proyecto propio | Sí |
| `DELETE` | `/api/proyectos/:proyectoId` | Desactivar proyecto propio | Sí |

`DELETE` representa una baja lógica.

---

## 23.3. Eventos

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/eventos` | Obtener eventos correspondientes al rol | Sí |
| `POST` | `/api/eventos` | Crear evento publicado | Sí |
| `GET` | `/api/eventos/:eventoId` | Obtener detalle | Sí |
| `PATCH` | `/api/eventos/:eventoId` | Actualizar evento propio | Sí |
| `POST` | `/api/eventos/:eventoId/cancelar` | Cancelar evento | Sí |

### `GET /api/eventos`

Para Músico:

- eventos publicados;
- eventos disponibles;
- eventos futuros o vigentes según filtros.

Para Organizador:

- eventos propios.

---

## 23.4. Postulaciones

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/eventos/:eventoId/postulaciones` | Postulaciones recibidas por un evento propio | Sí |
| `POST` | `/api/eventos/:eventoId/postulaciones` | Postular un proyecto propio | Sí |
| `GET` | `/api/postulaciones` | Obtener postulaciones relacionadas con el usuario | Sí |
| `GET` | `/api/postulaciones/:postulacionId` | Obtener detalle | Sí |
| `POST` | `/api/postulaciones/:postulacionId/aceptar` | Aceptar e iniciar contratación | Sí |
| `POST` | `/api/postulaciones/:postulacionId/rechazar` | Rechazar | Sí |

---

## 23.5. Contrataciones

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/contrataciones` | Obtener contrataciones relacionadas | Sí |
| `POST` | `/api/contrataciones` | Iniciar contratación directa | Sí |
| `GET` | `/api/contrataciones/:contratacionId` | Obtener detalle | Sí |
| `POST` | `/api/contrataciones/:contratacionId/cancelar` | Cancelar | Sí |
| `POST` | `/api/contrataciones/:contratacionId/completar` | Completar después del evento | Sí |

### POST directo

`POST /api/contrataciones` corresponde a la selección directa realizada por un organizador.

Las contrataciones originadas por postulaciones se crean mediante:

```text
POST /api/postulaciones/:postulacionId/aceptar
```

---

## 23.6. Ofertas

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/contrataciones/:contratacionId/ofertas` | Obtener historial | Sí |
| `POST` | `/api/contrataciones/:contratacionId/ofertas` | Crear oferta o contraoferta | Sí |
| `POST` | `/api/ofertas/:ofertaId/aceptar` | Aceptar propuesta vigente | Sí |
| `POST` | `/api/ofertas/:ofertaId/rechazar` | Rechazar propuesta vigente | Sí |

---

## 23.7. Valoraciones

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/contrataciones/:contratacionId/valoraciones` | Crear valoración | Sí |
| `GET` | `/api/contrataciones/:contratacionId/valoraciones` | Obtener valoraciones de la contratación | Sí |
| `GET` | `/api/usuarios/:usuarioId/valoraciones` | Consultar reputación de usuario | Según contexto |
| `GET` | `/api/proyectos/:proyectoId/valoraciones` | Consultar reputación del proyecto | Según contexto |

---

## 23.8. API pública

No requiere autenticación.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/publico/eventos` | Cartelera pública |
| `GET` | `/api/publico/eventos/:eventoId` | Detalle público |
| `GET` | `/api/publico/proyectos/:proyectoId` | Perfil público de proyecto |

Los endpoints públicos nunca devolverán:

- ofertas;
- negociaciones;
- postulaciones;
- datos privados;
- tokens;
- credenciales.

---

# 24. Respuestas HTTP generales

Como criterio general:

## `200 OK`

Consulta o actualización exitosa.

## `201 Created`

Creación exitosa.

## `400 Bad Request`

Datos inválidos o error de validación.

## `401 Unauthorized`

No existe una sesión válida.

## `403 Forbidden`

El usuario está autenticado pero no posee permisos.

## `404 Not Found`

El recurso no existe o no puede encontrarse dentro del contexto correspondiente.

## `409 Conflict`

Conflicto de reglas de negocio.

Ejemplos:

- postulación duplicada;
- músico no disponible;
- evento sin cupos;
- estado incompatible;
- oferta ya cerrada;
- contratación ya existente;
- valoración duplicada.

---

# 25. Operaciones que requieren transacción

Las siguientes operaciones deberán realizarse de forma atómica cuando involucren múltiples modificaciones relacionadas.

## Aceptar postulación

La aceptación de una postulación debe realizarse de forma atómica:

```text
1. validar sesión
2. validar rol ORGANIZADOR
3. validar ownership del evento
4. verificar Postulación = PENDIENTE
5. obtener músico propietario del proyecto
6. validar disponibilidad horaria del músico
7. Postulación seleccionada → ACEPTADA
8. otras postulaciones:
      mismo evento
      mismo músico
      estado PENDIENTE
   → CANCELADAS
9. crear Contratación NEGOCIANDO
10. commit
```

Si cualquiera de las validaciones falla, ninguna de las modificaciones debe persistirse.

La operación debe impedir que solicitudes concurrentes puedan generar más de una contratación activa para el mismo músico y evento.

## Crear contraoferta

```text
Oferta anterior → CONTRAOFERTADA
+
Nueva oferta → PROPUESTA
```

## Aceptar oferta

```text
validar disponibilidad
+
validar cupo
+
Oferta → ACEPTADA
+
Contratación → ACORDADO
+
agreed_amount
+
agreed_at
```

## Cancelar evento

```text
Evento → CANCELADO
+
Postulaciones pendientes → CANCELADAS
+
Contrataciones activas → CANCELADAS
```

Las operaciones deberán ser seguras también frente a solicitudes concurrentes.

---

# 26. Criterios generales de aceptación del MVP

El MVP se considera funcional cuando:

- [ ] Un usuario puede registrarse.
- [ ] Un usuario puede iniciar sesión.
- [ ] Un usuario puede cerrar sesión.
- [ ] El sistema reconoce correctamente su rol.
- [ ] Un músico puede crear múltiples proyectos.
- [ ] Un músico puede editar proyectos propios.
- [ ] Un músico puede desactivar proyectos.
- [ ] Un organizador puede crear eventos.
- [ ] Los eventos poseen inicio y finalización.
- [ ] Un músico puede buscar eventos.
- [ ] Un organizador puede buscar proyectos.
- [ ] Un músico puede enviar postulaciones.
- [ ] Un organizador puede aceptar o rechazar postulaciones.
- [ ] Aceptar una postulación crea una contratación.
- [ ] Un organizador puede iniciar directamente una contratación.
- [ ] La disponibilidad se controla por músico y no por proyecto.
- [ ] Un músico puede participar en dos eventos del mismo día si no se superponen.
- [ ] Un músico no puede negociar simultáneamente participaciones incompatibles.
- [ ] Las partes pueden enviar ofertas.
- [ ] Las partes pueden enviar contraofertas.
- [ ] Una oferta puede ser aceptada.
- [ ] El acuerdo registra el monto definitivo.
- [ ] Una contratación acordada ocupa cupo.
- [ ] El evento nunca supera sus cupos.
- [ ] Las partes pueden cancelar una contratación cuando corresponda.
- [ ] El organizador puede cancelar un evento.
- [ ] Cancelar un evento cancela sus procesos activos.
- [ ] Una contratación puede completarse después del evento.
- [ ] Las partes pueden valorarse después de completar.
- [ ] Una parte no puede valorar dos veces la misma contratación.
- [ ] Puede consultarse reputación.
- [ ] El público puede consultar cartelera sin autenticación.
- [ ] El público puede consultar proyectos confirmados.
- [ ] Los permisos impiden modificar recursos ajenos.
- [ ] Ningún endpoint privado puede saltarse la autorización manipulando manualmente una request.
- [ ] La aplicación funciona en desktop y dispositivos móviles.
- [ ] No existen secretos dentro del repositorio.
- [ ] El proyecto puede ejecutarse fuera del entorno local.
- [ ] El proyecto puede desplegarse en Vercel.

---

# 27. Principio de implementación

Las reglas de negocio definidas en este documento son responsabilidad del servidor.

La interfaz de usuario puede impedir acciones inválidas para mejorar la experiencia, pero **nunca debe considerarse una barrera de seguridad**.

Toda operación sensible deberá volver a validar en servidor:

```text
sesión
↓
usuario
↓
rol
↓
ownership
↓
estado del recurso
↓
reglas de negocio
↓
Zod
↓
Prisma
↓
PostgreSQL
```

El cliente nunca será considerado una fuente confiable para determinar:

- identidad;
- rol;
- propietario;
- participante;
- organizador;
- músico;
- destinatario de una valoración;
- estado anterior de un recurso;
- disponibilidad;
- cupos.

---

# 28. Regla final de alcance

No deberá implementarse ningún endpoint, integración o funcionalidad adicional que implique ampliar el alcance del MVP sin actualizar previamente este documento.

Ante una contradicción entre una implementación existente y este documento, deberá analizarse primero si:

1. la implementación está incorrecta;
2. el modelo de datos necesita una migración;
3. el requerimiento necesita ser revisado.

El agente de desarrollo no deberá inventar una nueva regla de negocio para resolver una ambigüedad.

En caso de detectar una ambigüedad, deberá informarla antes de introducir comportamiento no definido.