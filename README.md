# 🎸 Arma tu pogo

Plataforma web para conectar proyectos musicales, organizadores de eventos y público en un marketplace de recitales y fechas independientes.

Proyecto desarrollado para la materia **Metodologías de Desarrollo Web**.

---

## 🛠️ Stack Tecnológico

* **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Components y Server Actions)
* **Frontend:** [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
* **ORM & Base de Datos:** [Prisma ORM](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) (alojado en Supabase)
* **Autenticación & Almacenamiento:** [Supabase Auth & Storage](https://supabase.com/) (`@supabase/ssr`, `@supabase/supabase-js`)
* **Validación:** [Zod](https://zod.dev/) + React Hook Form
* **Lenguaje:** TypeScript

---

## 🚀 Comenzando

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local` y completa las variables correspondientes:

```bash
cp .env.example .env.local
```

Variables requeridas:
- `DATABASE_URL`: Cadena de conexión PostgreSQL de Prisma (modo transacción / pooler).
- `DIRECT_URL`: Cadena de conexión directa a PostgreSQL (utilizada para migraciones).
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key pública de Supabase.
- `NEXT_PUBLIC_APP_URL`: URL base de la aplicación (ej. `http://localhost:3000`).

### 3. Configuración e inicialización de la Base de Datos

El aprovisionamiento de la base de datos se divide claramente entre el modelo relacional de negocio y la infraestructura de almacenamiento:

1. **Generar el cliente de Prisma:**
   ```bash
   npx prisma generate
   ```

2. **Aplicar las migraciones del modelo de negocio:**
   ```bash
   npx prisma migrate deploy
   ```
   > Aplica las migraciones canónicas versionadas en `prisma/migrations/`.

3. **Aplicar la infraestructura de Supabase Storage / RLS:**
   Ejecutar en el **SQL Editor de Supabase** (o procedimiento documentado del proyecto) los scripts de infraestructura versionados:
   - `supabase/migrations/202610260002_project_images_storage.sql` (bucket `project-images` y políticas RLS).
   - `supabase/migrations/202610260003_event_images_storage.sql` (bucket `event-images` y políticas RLS).

   *Nota:* No ejecutar `supabase db push` ni asumir sincronización automática mediante Supabase CLI, ya que el historial de CLI de Supabase no está normalizado en la base remota.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📂 Estructura del Proyecto

```text
├── app/                  # Rutas, layouts y server actions (App Router)
│   ├── actions/          # Server Actions para auth, proyectos, eventos, etc.
│   ├── auth/             # Vistas de login, registro y callbacks
│   ├── dashboard/        # Dashboards protegidos (Músico / Organizador)
│   └── (public)/         # Cartelera pública y perfiles de artistas
├── components/           # Componentes de React (Auth, UI, Formularios)
├── docs/                 # Documentación funcional y técnica
│   ├── spec.md           # Fuente de verdad funcional del MVP
│   ├── estado-proyecto.md # Fotografía operativa del repositorio y deuda técnica
│   └── DATABASE.md       # Arquitectura, modelo Prisma y estrategia de migraciones
├── lib/                  # Lógica central, clientes y esquemas
│   ├── prisma.ts         # Cliente singleton de Prisma ORM
│   ├── supabase/         # Clientes de Supabase (browser y server)
│   ├── validations/      # Esquemas Zod de validación
│   └── types.ts          # Tipos de dominio compartidos
├── prisma/               # Esquema declarativo (schema.prisma) y migraciones de negocio
└── supabase/             # Scripts SQL de infraestructura (Storage y RLS)
```

---

## 📜 Scripts Disponibles

* `npm run dev` — Inicia el servidor de desarrollo Next.js.
* `npm run build` — Compila la aplicación para producción.
* `npm run lint` — Ejecuta ESLint para validar calidad de código.
* `npm test` — Ejecuta la suite de pruebas unitarias con Vitest.
* `npx prisma generate` — Genera los tipos y el cliente de Prisma.
* `npx prisma migrate status` — Consulta el estado de las migraciones de Prisma.
* `npx prisma studio` — Abre la interfaz gráfica para explorar la base de datos.

---

## 📖 Documentación

* [Especificación Funcional (`docs/spec.md`)](docs/spec.md)
* [Documentación de Base de Datos (`docs/DATABASE.md`)](docs/DATABASE.md)
* [Estado Operativo del Proyecto (`docs/estado-proyecto.md`)](docs/estado-proyecto.md)
* [Reglas de Trabajo para Agentes (`AGENTS.md`)](AGENTS.md)
