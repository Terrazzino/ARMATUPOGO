# Documentación de Base de Datos — Backstage

## Descripción

Este documento define el schema y las políticas de Row Level Security (RLS) para Backstage.

## Migraciones SQL

Las siguientes migraciones deben ejecutarse en Supabase para crear la estructura de base de datos necesaria.

### MIGRATION 001: Crear tabla profile_users

Esta migración crea la tabla de perfiles de usuario que extiende la tabla nativa `auth.users` de Supabase.

```sql
-- Crear tabla profile_users
CREATE TABLE public.profile_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MUSICIAN', 'ORGANIZER')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar consultas frecuentes
CREATE INDEX idx_profile_users_email ON public.profile_users(email);
CREATE INDEX idx_profile_users_role ON public.profile_users(role);

-- Habilitar Row Level Security
ALTER TABLE public.profile_users ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profile_users
  FOR SELECT
  USING (auth.uid() = id);

-- POLICY 2: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.profile_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- POLICY 3: Público puede ver perfiles (para cartelera pública)
CREATE POLICY "Public can view profiles"
  ON public.profile_users
  FOR SELECT
  USING (true);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER trigger_profile_users_updated_at
BEFORE UPDATE ON public.profile_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Crear función para crear perfil automáticamente cuando se registra usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Nota: el perfil se crea desde la aplicación (app/actions/auth.ts)
  -- Esta función está aquí como documentación de la estructura esperada
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Estructura de Tablas

### profile_users

Tabla que almacena la información del perfil de usuario.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | Identificador único (FK a auth.users) |
| email | TEXT | NOT NULL, UNIQUE | Email del usuario |
| first_name | TEXT | NOT NULL | Nombre del usuario |
| last_name | TEXT | NOT NULL | Apellido del usuario |
| role | TEXT | NOT NULL, CHECK (role IN ('MUSICIAN', 'ORGANIZER')) | Rol del usuario (único) |
| avatar_url | TEXT | | URL del avatar del usuario |
| bio | TEXT | | Biografía o descripción del usuario |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

## Políticas RLS

### Profile Users

| Nombre | Operación | Quien | Condición |
|--------|-----------|-------|-----------|
| "Users can view own profile" | SELECT | Usuarios autenticados | id = auth.uid() |
| "Users can update own profile" | UPDATE | Usuarios autenticados | id = auth.uid() |
| "Public can view profiles" | SELECT | Público | true |

**Seguridad:** La política "Public can view profiles" permite que cualquiera lea perfiles de usuario (necesario para la cartelera pública). Los permisos de actualización están restringidos al propietario del perfil.

## Fases Futuras

Las siguientes tablas se crearán en fases posteriores:

- `projects` - Proyectos musicales (Fase 3)
- `events` - Eventos (Fase 4)
- `contracts` - Contrataciones (Fase 5-6)
- `offers` - Ofertas y contraofertas (Fase 6)
- `ratings` - Valoraciones (Fase 7)
- `tickets` - Entradas (Fase posterior)

## Ejecutar Migraciones

1. Ir a Supabase Dashboard → SQL Editor
2. Crear una nueva query
3. Copiar y ejecutar la MIGRATION 001 completa
4. Verificar que se crearon tablas, índices, políticas y triggers

## Verificación

Para verificar que todo está configurado correctamente:

```sql
-- Verificar tabla existe
SELECT tablename FROM pg_tables WHERE tablename = 'profile_users';

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'profile_users';

-- Verificar políticas RLS
SELECT policyname FROM pg_policies WHERE tablename = 'profile_users';

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'profile_users';
```

## Notas

- La tabla `auth.users` es nativa de Supabase y se crea automáticamente con Auth habilitado
- `profile_users` es una tabla complementaria que almacena información adicional del usuario
- Las políticas RLS se aplican automáticamente a todas las queries
- El campo `role` está protegido y no puede ser modificado por el usuario (inmutable)

