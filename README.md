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
- `DATABASE_URL`: Cadena de conexión PostgreSQL de Prisma.
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key pública de Supabase.

### 3. Generar el cliente de Prisma

```bash
npx prisma generate
```

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
│   └── DATABASE.md       # Arquitectura y diagrama de base de datos
├── lib/                  # Lógica central, clientes y esquemas
│   ├── prisma.ts         # Cliente singleton de Prisma ORM
│   ├── supabase/         # Clientes de Supabase (browser y server)
│   ├── validations/      # Esquemas Zod de validación
│   └── types.ts          # Tipos de dominio compartidos
├── prisma/               # Esquema declarativo de Prisma (schema.prisma)
├── supabase/             # Migraciones SQL reproducibles
└── AGENTS.md             # Reglas de trabajo y desarrollo para agentes
```

---

## 📜 Scripts Disponibles

* `npm run dev` — Inicia el servidor de desarrollo Next.js.
* `npm run build` — Compila la aplicación para producción.
* `npm run lint` — Ejecuta ESLint para validar calidad de código.
* `npx prisma generate` — Genera los tipos y el cliente de Prisma.
* `npx prisma studio` — Abre la interfaz gráfica para explorar la base de datos.

---

## 📖 Documentación

* [Especificación Funcional (`docs/spec.md`)](docs/spec.md)
* [Documentación de Base de Datos (`docs/DATABASE.md`)](docs/DATABASE.md)
* [Reglas de Trabajo para Agentes (`AGENTS.md`)](AGENTS.md)
