import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient, type RolUsuario } from "@prisma/client";

// Instancia singleton para los scripts y fixtures de E2E
let prismaInstance: PrismaClient | null = null;
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public",
        },
      },
    });
  }
  return prismaInstance;
}

let supabaseAdminInstance: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        "Falta la variable SUPABASE_SERVICE_ROLE_KEY para inicializar el cliente de prueba E2E"
      );
    }

    supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminInstance;
}

export interface TestUserData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
}

/**
 * Elimina recursivamente registros de prueba en PostgreSQL y usuarios en Supabase Auth
 * respetando las restricciones de integridad relacional (FKs).
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  const prisma = getPrisma();
  const supabase = getSupabaseAdmin();

  const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

  const users = await prisma.usuario.findMany({
    where: { email: { in: normalizedEmails } },
    select: { id: true, email: true },
  });

  const userIds = users.map((u) => u.id);

  if (userIds.length > 0) {
    // 1. Eliminar valoraciones
    await prisma.valoracion.deleteMany({
      where: {
        OR: [
          { autorId: { in: userIds } },
          { destinatarioId: { in: userIds } },
        ],
      },
    });

    // 2. Eliminar ofertas
    await prisma.oferta.deleteMany({
      where: {
        OR: [
          { remitenteId: { in: userIds } },
          { contratacion: { organizadorId: { in: userIds } } },
          { contratacion: { musicoId: { in: userIds } } },
        ],
      },
    });

    // 3. Eliminar contrataciones
    await prisma.contratacion.deleteMany({
      where: {
        OR: [
          { organizadorId: { in: userIds } },
          { musicoId: { in: userIds } },
          { creadoPorId: { in: userIds } },
        ],
      },
    });

    // 4. Eliminar postulaciones
    await prisma.postulacion.deleteMany({
      where: {
        OR: [
          { musicoId: { in: userIds } },
          { evento: { organizadorId: { in: userIds } } },
        ],
      },
    });

    // 5. Eliminar entradas de eventos de estos organizadores
    await prisma.entrada.deleteMany({
      where: { evento: { organizadorId: { in: userIds } } },
    });

    // 6. Eliminar eventos
    await prisma.evento.deleteMany({
      where: { organizadorId: { in: userIds } },
    });

    // 7. Eliminar proyectos musicales
    await prisma.proyectoMusical.deleteMany({
      where: { usuarioId: { in: userIds } },
    });

    // 8. Eliminar notificaciones
    await prisma.notificacion.deleteMany({
      where: { usuarioId: { in: userIds } },
    });

    // 9. Eliminar usuario en Prisma
    await prisma.usuario.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  // 10. Eliminar usuarios en Supabase Auth por email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  if (authUsers?.users) {
    for (const authUser of authUsers.users) {
      if (authUser.email && normalizedEmails.includes(authUser.email.toLowerCase())) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }
  }
}

/**
 * Prepara de manera limpia y reproducible un usuario en Supabase Auth Local y PostgreSQL (Prisma).
 */
export async function createOrResetTestUser(data: TestUserData): Promise<{
  id: string;
  email: string;
  password: string;
  rol: RolUsuario;
}> {
  const prisma = getPrisma();
  const supabase = getSupabaseAdmin();
  const email = data.email.toLowerCase().trim();

  // Limpiar si ya existe
  await cleanupTestUsers([email]);

  // Crear en Supabase Auth con confirmación automática de email
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.nombre,
        last_name: data.apellido,
        role: data.rol,
      },
    });

  if (authError || !authData.user) {
    throw new Error(
      `Fallo al crear usuario en Supabase Auth Local: ${authError?.message || "Sin datos"}`
    );
  }

  const userId = authData.user.id;

  // Crear en tabla `usuarios` vía Prisma
  await prisma.usuario.create({
    data: {
      id: userId,
      email,
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol,
    },
  });

  return {
    id: userId,
    email,
    password: data.password,
    rol: data.rol,
  };
}

/**
 * Crea un proyecto musical asociado a un usuario músico.
 */
export async function createTestProject(params: {
  usuarioId: string;
  nombre: string;
  genero: string;
  cacheAproximado?: number;
  descripcion?: string;
  ciudad?: string;
}) {
  const prisma = getPrisma();
  return prisma.proyectoMusical.create({
    data: {
      usuarioId: params.usuarioId,
      nombre: params.nombre,
      genero: params.genero,
      cacheAproximado: params.cacheAproximado,
      descripcion: params.descripcion || "Proyecto musical de pruebas E2E",
      ciudad: params.ciudad || "CABA",
      estaActivo: true,
    },
  });
}

/**
 * Crea un evento asociado a un organizador.
 */
export async function createTestEvent(params: {
  organizadorId: string;
  titulo: string;
  startsAt: Date;
  endsAt: Date;
  ubicacion?: string;
  ciudad?: string;
  cantidadMusicosRequerida?: number;
  precioEntrada?: number;
  cacheOfrecido?: number;
  descripcion?: string;
}) {
  const prisma = getPrisma();
  return prisma.evento.create({
    data: {
      organizadorId: params.organizadorId,
      titulo: params.titulo,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      ubicacion: params.ubicacion || "Av. Santa Fe 1234",
      ciudad: params.ciudad || "CABA",
      cantidadMusicosRequerida: params.cantidadMusicosRequerida ?? 2,
      cacheOfrecido: params.cacheOfrecido ?? 50000,
      descripcion: params.descripcion || "Evento de prueba E2E",
      entradas: {
        create: {
          precio: params.precioEntrada ?? 3000,
          tipoEntrada: "GENERAL",
          esGratuita: (params.precioEntrada ?? 3000) === 0,
        },
      },
    },
    include: {
      entradas: true,
    },
  });
}

