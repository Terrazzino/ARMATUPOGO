# BACKSTAGE — AGENTS.md

## 1. Propósito

Este archivo define las reglas de trabajo que deben seguir los agentes de desarrollo que modifiquen este proyecto.

El proyecto se denomina **Backstage** y corresponde a una aplicación web desarrollada para la materia **Metodologías de Desarrollo Web**.

El objetivo es construir una plataforma que conecte proyectos musicales, organizadores de eventos y público, respetando el alcance definido en la especificación funcional.

---

# 2. FUENTE DE VERDAD

El archivo:

`docs/spec.md`

es la **fuente de verdad funcional del proyecto**.

Antes de implementar o modificar funcionalidades:

1. Leer `docs/spec.md`.
2. Verificar que el cambio solicitado esté dentro del alcance.
3. Respetar las entidades, roles, historias de usuario y reglas de negocio allí definidas.
4. No inventar requisitos funcionales.
5. No eliminar requisitos existentes.
6. No modificar decisiones funcionales importantes sin indicarlo explícitamente.

Si existe una contradicción entre una solicitud y `docs/spec.md`, detenerse y explicar la contradicción antes de realizar cambios.

---

# 3. PRINCIPIOS GENERALES

Priorizar, en este orden:

1. Correctitud funcional.
2. Seguridad.
3. Experiencia de usuario.
4. Mantenibilidad.
5. Rendimiento.
6. Accesibilidad.
7. SEO cuando corresponda.
8. Estética.

La solución debe ser tan simple como sea posible, pero suficientemente completa para cumplir la especificación.

Evitar complejidad innecesaria.

No agregar funcionalidades solamente porque técnicamente sean posibles.

---

# 4. PROYECTO EXISTENTE

Este proyecto ya existe.

Nunca crear un segundo proyecto Next.js.

Nunca crear una nueva carpeta raíz para la aplicación.

Antes de modificar archivos:

* inspeccionar la estructura existente;
* revisar `package.json`;
* revisar las configuraciones existentes;
* revisar `docs/spec.md`;
* reutilizar código existente cuando sea apropiado.

No reescribir archivos completos cuando solamente sea necesario modificar una parte.

No eliminar funcionalidades existentes sin justificación.

---

# 5. STACK

El stack principal del proyecto es:

* Next.js
* React
* TypeScript
* App Router
* Tailwind CSS
* ESLint
* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage cuando corresponda
* Git
* GitHub
* Vercel

Utilizar las tecnologías existentes antes de incorporar nuevas.

No incorporar:

* Firebase;
* MongoDB;
* un backend separado;
* otra base de datos;

salvo que el propietario del proyecto modifique explícitamente esta decisión.

---

# 6. DEPENDENCIAS

No instalar dependencias nuevas innecesariamente.

Antes de agregar una dependencia:

1. comprobar si Next.js, React, TypeScript o Tailwind ya resuelven el problema;
2. comprobar si existe una funcionalidad nativa adecuada;
3. evaluar el impacto sobre rendimiento y mantenimiento;
4. explicar brevemente por qué es necesaria.

No instalar librerías solamente por comodidad.

Mantener `package.json` limpio.

---

# 7. ARQUITECTURA

Utilizar Next.js App Router.

Preferir Server Components cuando no sea necesario JavaScript en el cliente.

Utilizar Client Components únicamente cuando exista una necesidad real de interacción en el navegador.

Separar correctamente:

* UI;
* lógica de negocio;
* acceso a datos;
* autenticación;
* autorización;
* validación.

Evitar abstracciones excesivas.

No crear capas innecesarias.

El código debe poder ser comprendido por un estudiante que posteriormente deberá explicar el proyecto.

---

# 8. SUPABASE

Supabase será utilizado como:

* autenticación;
* base de datos PostgreSQL;
* almacenamiento de archivos cuando corresponda.

Utilizar:

* `@supabase/supabase-js`;
* `@supabase/ssr`.

Separar correctamente el cliente de Supabase para servidor y navegador según corresponda.

No exponer credenciales privadas.

No utilizar la `service_role` en código ejecutado en el navegador.

---

# 9. VARIABLES DE ENTORNO

Las variables sensibles deben utilizar variables de entorno.

Nunca escribir:

* contraseñas;
* API keys privadas;
* tokens;
* secrets;
* service role keys;

directamente en el código.

No mostrar secretos en logs.

Mantener `.env.local` fuera del repositorio.

Mantener `.env.example` sin credenciales reales.

Nunca modificar `.gitignore` para permitir subir secretos.

---

# 10. AUTENTICACIÓN Y AUTORIZACIÓN

La autenticación debe realizarse mediante Supabase Auth.

Nunca implementar almacenamiento manual de contraseñas.

Diferenciar:

### Autenticación

Determina quién es el usuario.

### Autorización

Determina qué puede hacer el usuario.

Los permisos no deben depender únicamente del frontend.

Las operaciones sensibles deben validarse en servidor y mediante las políticas correspondientes de Supabase.

---

# 11. ROLES

Los roles funcionales definidos por el proyecto son:

* `MUSICO`
* `ORGANIZADOR`
* `PUBLICO`

El usuario público no necesita autenticarse para consultar el contenido público.

Una cuenta autenticada no debe funcionar simultáneamente como músico y organizador, salvo que `docs/spec.md` sea modificado explícitamente.

No inventar roles adicionales sin autorización.

---

# 12. SEGURIDAD DE DATOS

Implementar seguridad siguiendo el principio de mínimo privilegio.

Cuando corresponda utilizar Supabase:

* Row Level Security;
* policies;
* restricciones de propietario;
* validaciones del lado servidor.

Un usuario solamente debe poder modificar recursos que tenga autorización para modificar.

Nunca confiar exclusivamente en IDs enviados desde el cliente.

Las reglas de autorización deben continuar siendo válidas aunque un usuario manipule manualmente una URL o una request.

---

# 13. BASE DE DATOS

Las modificaciones estructurales de la base de datos deben realizarse mediante migraciones reproducibles.

No depender exclusivamente de modificaciones manuales realizadas desde el dashboard de Supabase.

Las tablas, relaciones, constraints, índices, funciones y policies deben estar documentadas mediante migraciones cuando corresponda.

Evitar duplicación innecesaria de datos.

Utilizar claves primarias, foráneas y restricciones apropiadas.

---

# 14. VALIDACIÓN

Todo dato recibido desde el usuario debe considerarse no confiable.

Validar:

* campos obligatorios;
* tipos;
* formatos;
* rangos;
* relaciones;
* permisos;
* estados;
* duplicados.

La validación del frontend mejora la experiencia de usuario, pero nunca reemplaza la validación del servidor o de la base de datos.

---

# 15. MANEJO DE ESTADOS

Las interfaces deben contemplar:

* loading;
* success;
* error;
* empty state;
* unauthorized;
* not found.

No mostrar pantallas vacías cuando pueda explicarse claramente qué ocurrió.

Los mensajes de error deben ser comprensibles y no revelar información sensible.

---

# 16. INTERFAZ Y UX

La interfaz debe ser:

* clara;
* profesional;
* moderna;
* accesible;
* responsive;
* orientada a las necesidades reales del usuario.

Diseñar para:

* mobile;
* tablet;
* desktop.

Evitar diseños genéricos producidos automáticamente.

Evitar excesos de:

* gradientes;
* glassmorphism;
* animaciones;
* sombras;
* efectos decorativos;
* componentes sin propósito.

Cada elemento visual debe tener una función.

---

# 17. IDENTIDAD DE BACKSTAGE

Backstage debe transmitir:

* música;
* profesionalismo;
* confianza;
* oportunidades;
* comunidad.

La estética debe estar relacionada con el mundo musical, pero sin perjudicar legibilidad o usabilidad.

No inventar información comercial.

No inventar:

* precios;
* horarios;
* testimonios;
* clientes;
* premios;
* certificaciones;
* estadísticas;
* asociaciones.

Cuando falte información real, utilizar placeholders claramente identificables.

---

# 18. RESPONSIVE

Todas las funcionalidades deben probarse en:

* mobile;
* tablet;
* desktop.

No considerar terminada una funcionalidad si solamente funciona correctamente en escritorio.

Prestar especial atención a:

* navegación;
* formularios;
* cards;
* tablas;
* filtros;
* dashboards;
* botones;
* modales.

---

# 19. ACCESIBILIDAD

Utilizar:

* HTML semántico;
* labels;
* alt text;
* navegación por teclado;
* focus visible;
* botones accesibles;
* enlaces accesibles;
* contraste adecuado.

No utilizar color como único indicador de estado.

Los formularios deben proporcionar mensajes de error claros.

---

# 20. SEO

Las páginas públicas deben utilizar cuando corresponda:

* títulos;
* meta descriptions;
* headings semánticos;
* URLs descriptivas;
* Open Graph;
* sitemap;
* robots.txt;
* structured data cuando aporte valor.

Las páginas privadas deben evitar indexación cuando corresponda.

---

# 21. PERFORMANCE

Priorizar rendimiento.

Preferir:

* Server Components;
* consultas eficientes;
* imágenes optimizadas;
* lazy loading cuando corresponda;
* poco JavaScript;
* pocas dependencias;
* assets optimizados.

No agregar efectos visuales costosos sin justificación.

No optimizar prematuramente de forma que aumente innecesariamente la complejidad.

---

# 22. FORMULARIOS

Los formularios deben:

* tener labels;
* validar campos;
* mostrar errores;
* mostrar estado de envío;
* evitar múltiples envíos accidentales;
* informar éxito;
* informar errores.

Los datos deben validarse nuevamente fuera del cliente cuando corresponda.

---

# 23. ARCHIVOS E IMÁGENES

Cuando el sistema permita subir imágenes:

* validar tipo;
* validar tamaño;
* controlar permisos;
* utilizar nombres seguros;
* evitar confiar en la extensión;
* impedir acceso indebido;
* utilizar Supabase Storage cuando corresponda.

No permitir que un usuario modifique o elimine archivos pertenecientes a otro usuario.

---

# 24. GIT

Realizar commits pequeños y descriptivos.

Ejemplos:

`feat: implement authentication`

`feat: add musical project management`

`feat: add event board`

`fix: enforce project ownership`

`fix: enforce event permissions`

`test: validate authentication flow`

Evitar commits gigantes que mezclen funcionalidades no relacionadas.

Nunca realizar operaciones destructivas de Git sin confirmación explícita.

No ejecutar automáticamente:

* `git reset --hard`;
* `git clean -fd`;
* eliminación masiva de archivos;
* force push.

---

# 25. TESTING

Después de cambios importantes ejecutar, cuando corresponda:

`npm run lint`

`npm run build`

Además realizar pruebas funcionales.

Comprobar:

* autenticación;
* autorización;
* formularios;
* navegación;
* estados;
* permisos;
* responsive;
* errores;
* datos.

No considerar una funcionalidad terminada únicamente porque el código compila.

---

# 26. BUILD Y LINT

Una etapa no debe considerarse terminada si existen errores conocidos de:

* TypeScript;
* ESLint;
* build;
* runtime.

Antes de finalizar una etapa:

`npm run lint`

`npm run build`

Si algún comando falla:

1. investigar el error;
2. corregirlo;
3. volver a ejecutar;
4. informar el resultado.

---

# 27. NO MODIFICAR SIN NECESIDAD

No modificar:

* configuraciones;
* dependencias;
* estructura;
* documentación;
* variables de entorno;

si no existe una razón relacionada con la tarea actual.

Antes de modificar una configuración existente, comprobar qué problema resuelve.

---

# 28. DOCUMENTACIÓN

Cuando una decisión técnica importante sea necesaria, documentarla brevemente.

No crear documentación redundante.

Mantener especialmente actualizados:

* `docs/spec.md` cuando corresponda;
* `AGENTS.md`;
* `.env.example`;
* documentación de instalación;
* instrucciones de deployment.

No modificar `docs/spec.md` automáticamente para justificar una implementación que contradiga la especificación.

---

# 29. REGLA SOBRE NUEVAS FUNCIONALIDADES

Si una solicitud implica una funcionalidad que no está contemplada en `docs/spec.md` y puede modificar el alcance del MVP:

1. identificarla;
2. explicar qué cambia;
3. explicar el impacto;
4. detener la implementación de esa parte;
5. solicitar aprobación.

No asumir automáticamente que una nueva idea debe incorporarse al MVP.

---

# 30. REGLA SOBRE CAMBIOS

Diferenciar:

### Bug

Algo que debería funcionar según la especificación y no funciona.

Debe corregirse.

### Cambio

Modificación de un comportamiento existente.

Debe explicarse antes de implementarse si afecta decisiones funcionales.

### Nueva funcionalidad

Algo que no estaba contemplado.

Debe identificarse como ampliación del alcance.

---

# 31. METODOLOGÍA DE DESARROLLO

Trabajar por etapas.

Cada etapa debe:

1. analizar el código existente;
2. implementar únicamente el alcance solicitado;
3. probar;
4. ejecutar lint;
5. ejecutar build;
6. revisar errores;
7. informar los cambios;
8. detenerse.

No continuar automáticamente con la siguiente etapa.

---

# 32. ORDEN DEL MVP

El desarrollo debe seguir aproximadamente este orden, siempre respetando `docs/spec.md`:

1. Configuración e infraestructura.
2. Supabase.
3. Autenticación.
4. Perfiles y roles.
5. Proyectos musicales.
6. Perfiles públicos.
7. Eventos.
8. Cartelera.
9. Postulaciones.
10. Contrataciones.
11. Ofertas y contraofertas.
12. Cancelaciones.
13. Valoraciones.
14. Reputación.
15. UX y responsive.
16. Accesibilidad.
17. SEO.
18. Performance.
19. Seguridad final.
20. Testing integral.
21. Deployment.

---

# 33. ALCANCE

No implementar funcionalidades que `docs/spec.md` indique explícitamente como fuera del alcance.

En particular, no incorporar por iniciativa propia:

* pagos reales;
* Mercado Pago;
* Stripe;
* venta real de entradas;
* chat general;
* aplicación móvil;
* recomendaciones mediante IA;
* integraciones automáticas con redes sociales;
* funcionalidades administrativas no definidas;
* funcionalidades comerciales avanzadas.

Si `docs/spec.md` cambia, volver a evaluar esta sección.

---

# 34. COMPORTAMIENTO DEL AGENT

Antes de realizar cambios:

* inspeccionar;
* razonar;
* verificar;
* implementar.

No asumir.

No inventar.

No sobreingenierizar.

No reemplazar código funcional sin necesidad.

No modificar archivos no relacionados con la tarea.

Si existe incertidumbre funcional importante, preguntar antes de implementar.

Si existe una decisión técnica menor, elegir la alternativa más simple y segura, documentando la decisión cuando sea relevante.

---

# 35. RESULTADO ESPERADO

El código debe ser:

* funcional;
* seguro;
* mantenible;
* legible;
* responsive;
* accesible;
* razonablemente performante;
* coherente con `docs/spec.md`;
* explicable por el estudiante responsable del proyecto.

El objetivo no es generar la mayor cantidad de código posible.

El objetivo es construir correctamente Backstage.
