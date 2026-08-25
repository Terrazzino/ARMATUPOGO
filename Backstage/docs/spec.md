# Especificación del sistema — Backstage

> Este documento es el relevamiento de requerimientos del proyecto. Se mantiene actualizado durante el desarrollo.
> Regla práctica: si una funcionalidad no está definida en este documento, no forma parte del MVP salvo que el equipo la acuerde y actualice previamente.

## 1. El problema

**Para quién:** músicos y proyectos musicales que buscan participar en eventos, organizadores que necesitan contratar artistas y público que busca información sobre eventos musicales.

**Qué ocurre hoy sin el sistema:** músicos y organizadores suelen encontrarse mediante redes sociales, contactos personales o publicaciones aisladas. La información sobre cachés, eventos, disponibilidad y antecedentes queda dispersa y no existe un espacio centralizado que facilite la contratación y permita conocer la reputación de las partes.

**Qué mejora:** Backstage centraliza la oferta y demanda de músicos para eventos, permite publicar y descubrir oportunidades, facilita la negociación del caché, registra los acuerdos alcanzados y construye un sistema de reputación para músicos y organizadores. Además, ofrece una cartelera pública para que el público pueda descubrir eventos y artistas.

## 2. Alcance del MVP

El MVP se concentrará en el núcleo del marketplace: registro y autenticación de usuarios, administración de proyectos musicales, publicación y búsqueda de eventos, postulación y selección de músicos, negociación mediante ofertas y contraofertas, registro del acuerdo alcanzado, valoración posterior de las partes y cartelera pública de eventos.

El MVP no procesará pagos reales ni realizará transferencias de dinero. El sistema podrá registrar el monto acordado entre las partes, pero el pago efectivo se realizará por fuera de Backstage.

La venta real de entradas y los mecanismos avanzados de monetización podrán quedar preparados conceptualmente para una versión posterior, pero no forman parte del procesamiento de pagos del MVP.

## 3. Roles

| Rol | Quién es | Qué puede hacer que los otros no |
|---|---|---|
| **Músico** | Persona que representa uno o varios proyectos musicales | Registrar y administrar proyectos, postularse a eventos, negociar contrataciones y valorar organizadores |
| **Organizador** | Persona o entidad que organiza eventos | Crear y administrar eventos, buscar/seleccionar músicos, negociar contrataciones y valorar músicos |
| **Público** | Visitante interesado en asistir o conocer eventos | Consultar la cartelera, ver artistas participantes y acceder a sus redes y plataformas musicales |

El público no necesita una cuenta para consultar la cartelera pública.

Un usuario autenticado tendrá un rol de Músico o de Organizador en el MVP. No se contempla que una misma cuenta tenga ambos roles simultáneamente.

## 4. Entidades

Los sustantivos que aparecen en las historias de usuario forman la base del modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Una persona autenticada dentro de la plataforma, con un rol | Proyecto Musical · Evento · Contratación · Oferta · Valoración |
| **Proyecto Musical** | Una banda, solista, dúo, tributo u otro proyecto artístico administrado por un músico | Usuario (N-1) · Contratación (1-N) · Valoración (1-N) |
| **Evento** | Un recital o evento publicado por un organizador | Usuario (N-1) · Contratación (1-N) |
| **Contratación** | El acuerdo entre un proyecto musical y un organizador para participar en un evento | Evento (N-1) · Proyecto Musical (N-1) · Ofertas (1-N) · Valoraciones |
| **Oferta** | Una propuesta económica o contraoferta realizada durante una negociación | Contratación (N-1) · Usuario (N-1) |
| **Valoración** | La evaluación realizada por una de las partes después de una contratación | Contratación (N-1) · Usuario/Proyecto Musical |
| **Entrada** | Registro conceptual de una entrada asociada a un evento | Evento (N-1) |

> En el MVP, `Entrada` no implica un sistema de pago real. Su implementación se definirá según el alcance que acuerde la cátedra.

**Relación 1-N:** un músico puede administrar varios proyectos musicales; un organizador puede publicar varios eventos; un evento puede tener varias contrataciones; una contratación puede contener varias ofertas.

**Relación N-N conceptual:** músicos/proyectos musicales y eventos se vinculan mediante `Contratación`, que representa el proceso y el acuerdo entre ambas partes.

## 5. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.

### H1 — Registrar una cuenta

**Como** usuario, **quiero** registrarme indicando mi rol, **para** poder utilizar las funcionalidades correspondientes de Backstage.

Criterios de aceptación:
- [ ] Cuando una persona completa los datos obligatorios y selecciona un rol permitido, entonces se crea su cuenta.
- [ ] El sistema no permite acceder a funcionalidades privadas sin autenticación.
- [ ] El usuario solo puede utilizar las funcionalidades correspondientes a su rol.
- [ ] Caso de error: si los datos obligatorios son inválidos o la cuenta ya existe, no se crea una nueva cuenta y se informa el motivo.

### H2 — Registrar un proyecto musical

**Como** músico, **quiero** registrar uno o varios proyectos musicales, **para** ofrecerlos a organizadores.

Criterios de aceptación:
- [ ] El músico puede registrar nombre, descripción, género musical, caché aproximado, redes sociales y plataformas donde publica su música.
- [ ] Un músico puede administrar más de un proyecto desde su cuenta.
- [ ] El proyecto aparece disponible para ser consultado según las reglas de visibilidad definidas.
- [ ] Un organizador puede consultar la información pública del proyecto antes de iniciar una contratación.

### H3 — Publicar un evento

**Como** organizador, **quiero** publicar un evento, **para** encontrar músicos que participen del mismo.

Criterios de aceptación:
- [ ] El organizador puede indicar como mínimo nombre del evento, fecha, ubicación, cantidad de proyectos musicales requeridos y caché ofrecido.
- [ ] El organizador puede publicar el evento para recibir postulaciones.
- [ ] El organizador puede consultar las postulaciones recibidas.
- [ ] Caso de error: no se publica un evento si faltan datos obligatorios.

### H4 — Buscar y postularse a un evento

**Como** músico, **quiero** consultar eventos disponibles y solicitar participar, **para** conseguir contrataciones.

Criterios de aceptación:
- [ ] El músico puede consultar eventos publicados.
- [ ] El músico puede seleccionar un proyecto musical propio y solicitar participar.
- [ ] El organizador recibe la postulación y puede aceptarla, rechazarla o iniciar la negociación.
- [ ] Un mismo proyecto no puede generar postulaciones duplicadas para la misma necesidad de un evento.

### H5 — Seleccionar un músico

**Como** organizador, **quiero** buscar proyectos musicales y seleccionar uno para mi evento, **para** cubrir las necesidades del evento.

Criterios de aceptación:
- [ ] El organizador puede consultar información pública de los proyectos musicales.
- [ ] Puede iniciar una contratación con un proyecto.
- [ ] La contratación queda asociada al evento y al proyecto musical correspondiente.
- [ ] La contratación puede pasar al estado de negociación.

### H6 — Negociar el caché

**Como** músico u organizador, **quiero** realizar ofertas y contraofertas, **para** acordar el monto de la contratación.

Criterios de aceptación:
- [ ] La parte que inicia la negociación puede enviar una oferta económica.
- [ ] La otra parte puede aceptar, rechazar o realizar una contraoferta.
- [ ] Las sucesivas ofertas quedan registradas dentro de la contratación.
- [ ] Cuando una parte acepta una oferta, la contratación pasa a estado acordado.
- [ ] El monto acordado queda registrado y no puede ser modificado unilateralmente.
- [ ] Caso de error: una oferta no puede ser aceptada si la contratación ya fue cerrada o cancelada.

### H7 — Registrar una contratación

**Como** músico u organizador, **quiero** consultar el acuerdo alcanzado, **para** conocer las condiciones bajo las cuales se realizará la participación.

Criterios de aceptación:
- [ ] La contratación registra evento, proyecto musical, organizador, monto acordado y estado.
- [ ] Una contratación acordada conserva el monto pactado aunque posteriormente cambien precios o condiciones económicas externas.
- [ ] Ambas partes pueden consultar el acuerdo asociado a sus cuentas.
- [ ] El sistema no permite que una parte modifique unilateralmente el acuerdo.

### H8 — Valorar una contratación

**Como** músico, **quiero** valorar al organizador después del evento, **para** aportar información sobre su reputación.

**Como** organizador, **quiero** valorar al proyecto musical después del evento, **para** aportar información sobre su reputación.

Criterios de aceptación:
- [ ] Solo pueden valorar las partes que participaron de una contratación válida.
- [ ] La valoración se habilita después de la fecha del evento.
- [ ] Una misma parte no puede valorar más de una vez la misma contratación.
- [ ] La valoración queda asociada a la contratación que la originó.
- [ ] La reputación acumulada puede ser consultada antes de una nueva contratación.

### H9 — Consultar la reputación

**Como** músico u organizador, **quiero** consultar la valoración de la otra parte, **para** decidir si quiero trabajar con ella.

Criterios de aceptación:
- [ ] El perfil correspondiente muestra una valoración calculada a partir de las contrataciones calificadas.
- [ ] Se pueden consultar las valoraciones recibidas de contrataciones anteriores según el nivel de detalle definido para el MVP.
- [ ] No se pueden generar valoraciones sin una contratación que las respalde.

### H10 — Consultar la cartelera pública

**Como** público, **quiero** consultar los eventos disponibles, **para** conocer qué recitales puedo visitar.

Criterios de aceptación:
- [ ] La cartelera es accesible sin iniciar sesión.
- [ ] Cada evento publicado muestra la información pública definida para el evento.
- [ ] Se pueden consultar los proyectos musicales participantes.
- [ ] El público puede acceder a los enlaces de redes sociales y plataformas musicales de los proyectos.
- [ ] Los eventos que no estén publicados o que ya no deban mostrarse no aparecen en la cartelera pública.

## 6. Flujo principal

El recorrido principal que da valor al sistema es el proceso de contratación entre un organizador y un proyecto musical.

1. Un músico crea su cuenta y registra uno o varios proyectos musicales.
2. El músico completa la información pública de cada proyecto, incluyendo género, descripción, caché aproximado y enlaces.
3. Un organizador crea su cuenta y publica un evento indicando fecha, ubicación, cantidad de proyectos requeridos y caché ofrecido.
4. Un proyecto musical encuentra el evento y solicita participar, o el organizador busca un proyecto y propone iniciar una contratación.
5. Se crea una contratación entre el evento y el proyecto musical.
6. Se inicia la negociación económica mediante ofertas y contraofertas.
7. Ambas partes continúan negociando hasta que una oferta es aceptada o la negociación se cancela.
8. Al aceptar una oferta, el monto acordado queda registrado en la contratación.
9. El evento se realiza en la fecha establecida.
10. Una vez finalizado el evento, el músico y el organizador pueden valorar a la otra parte.
11. Las valoraciones pasan a formar parte de la reputación de cada parte para futuras contrataciones.
12. Paralelamente, el público puede consultar la cartelera, conocer los proyectos participantes y acceder a sus redes y plataformas musicales.

## 7. Reglas de negocio

Las restricciones que definen el comportamiento del sistema y que no deben quedar a criterio de la implementación.

- Un usuario autenticado tiene un único rol dentro del MVP: **Músico** u **Organizador**.
- Un músico puede registrar múltiples proyectos musicales.
- Un proyecto musical pertenece a un músico.
- Un organizador puede publicar múltiples eventos.
- Un evento pertenece a un organizador.
- Un evento puede requerir uno o varios proyectos musicales.
- Un proyecto musical puede participar de múltiples eventos mediante distintas contrataciones.
- Toda negociación debe estar asociada a una contratación concreta.
- Cada oferta debe registrar quién la realizó y cuándo.
- Una contraoferta reemplaza la propuesta vigente para efectos de negociación, pero el historial de ofertas se conserva.
- El monto acordado se considera definitivo dentro de la contratación y no puede ser modificado unilateralmente.
- El dinero real no se transfiere mediante Backstage durante el MVP.
- Solo las partes que participaron de una contratación pueden valorarse entre sí.
- Una valoración solo puede realizarse una vez por parte y por contratación.
- La valoración debe estar respaldada por una contratación existente.
- Un evento no puede aceptar más proyectos de los cupos disponibles.
- Una contratación no puede continuar negociándose una vez que fue acordada, cancelada o cerrada.
- El público puede consultar información pública sin necesidad de registrarse.
- La información privada de usuarios y negociaciones no se expone al público.
- El caché aproximado publicado por un proyecto musical sirve como referencia y no constituye una obligación contractual hasta que exista un acuerdo.
- El caché acordado en una contratación es independiente del caché aproximado publicado en el perfil del proyecto.
- Los pagos y transferencias reales quedan fuera del MVP.

## 8. Requisitos no funcionales

### Usabilidad

- [ ] Los flujos principales deben ser comprensibles sin capacitación previa.
- [ ] Los formularios deben conservar la información ya ingresada cuando exista un error de validación.
- [ ] Los estados de eventos y contrataciones deben ser claros para evitar confusiones entre postulación, negociación, acuerdo, cancelación y cierre.
- [ ] El proceso de negociación debe mostrar claramente la oferta vigente y el historial de propuestas.
- [ ] La aplicación debe ser responsive y usable en celular, tablet y desktop.

### Accesibilidad

- [ ] Todo se puede operar con teclado y se ve dónde está el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo placeholder.
- [ ] Las imágenes informativas tienen texto alternativo; las decorativas, alternativo vacío.
- [ ] El contraste entre texto y fondo llega a 4,5:1 (3:1 si la letra es grande).
- [ ] Los errores nunca se comunican solo mediante color: siempre incluyen texto.

### Seguridad

- [ ] Las funcionalidades privadas requieren autenticación.
- [ ] El backend debe validar el rol y los permisos; no se debe confiar únicamente en las restricciones de la interfaz.
- [ ] Un músico solo puede modificar sus propios proyectos.
- [ ] Un organizador solo puede modificar sus propios eventos.
- [ ] Las negociaciones solo son accesibles para las partes involucradas.
- [ ] Las valoraciones solo pueden ser creadas por participantes de la contratación correspondiente.
- [ ] Las credenciales, claves y secretos no se almacenan en el repositorio.
- [ ] Las variables sensibles se gestionan mediante variables de entorno.
- [ ] Si se utiliza Supabase, las políticas de RLS deben impedir el acceso no autorizado a datos privados.

## 9. Integraciones externas

**Supabase:** base de datos, autenticación y almacenamiento de archivos si el MVP requiere imágenes de eventos o proyectos.

**Vercel:** despliegue de la aplicación web.

**GitHub:** repositorio, control de versiones y flujo de trabajo mediante ramas y Pull Requests.

No se incorporarán integraciones de pago en el MVP.

Las redes sociales y plataformas musicales se manejarán inicialmente mediante enlaces externos proporcionados por los usuarios, sin necesidad de integrar sus APIs.

## 10. Fuera de alcance

Lo que decidimos no implementar en el MVP.

- **Pagos y transferencias de dinero.** El sistema registra el monto acordado, pero no procesa el pago.
- **Venta real de entradas y procesamiento de pagos para entradas.** Queda para una versión posterior.
- **Sistema de billetera o saldo interno.**
- **Facturación o emisión de comprobantes fiscales.**
- **Integración con bancos, Mercado Pago, Stripe u otras plataformas de pago.**
- **Aplicación móvil nativa.** El MVP será una aplicación web responsive.
- **Chat general entre usuarios.** La comunicación económica se limitará al sistema de ofertas y contraofertas definido.
- **Integración automática con redes sociales o plataformas musicales.** Se utilizarán enlaces externos.
- **Verificación externa de identidad o antecedentes de músicos y organizadores.**
- **Algoritmos avanzados de recomendación mediante inteligencia artificial.**
- **Gestión completa de producción de eventos**, como venta de merchandising, catering, iluminación, sonido o logística.
- **Gestión contable de las contrataciones.**
- **Sistema avanzado de publicidad automatizada.** La publicidad se contempla como modelo de negocio futuro, no como núcleo del MVP.
- **Múltiples roles simultáneos para una misma cuenta.**

## 11. Criterios generales de aceptación del MVP

El MVP se considerará funcional cuando:

- [ ] Un usuario pueda registrarse e iniciar sesión.
- [ ] Un músico pueda crear y administrar al menos un proyecto musical.
- [ ] Un organizador pueda crear y publicar un evento.
- [ ] Un músico pueda encontrar un evento y postular uno de sus proyectos.
- [ ] Un organizador pueda seleccionar/iniciar una contratación con un proyecto.
- [ ] Ambas partes puedan negociar mediante ofertas y contraofertas.
- [ ] El sistema pueda registrar un acuerdo con un monto definitivo.
- [ ] El acuerdo pueda ser consultado por ambas partes.
- [ ] Después del evento, ambas partes puedan valorarse mutuamente.
- [ ] La reputación resultante pueda consultarse.
- [ ] El público pueda consultar una cartelera pública de eventos.
- [ ] El público pueda consultar los proyectos participantes y sus enlaces externos.
- [ ] Los permisos impidan que un usuario modifique información que no le pertenece.
- [ ] La aplicación funcione correctamente en desktop y dispositivos móviles.
- [ ] No existan secretos ni credenciales privadas dentro del repositorio.
- [ ] El proyecto pueda ejecutarse y desplegarse fuera del entorno local.
