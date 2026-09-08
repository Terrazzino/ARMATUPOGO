BEGIN;

DROP TABLE public."valoraciones";
DROP TABLE public."ofertas";
DROP TABLE public."contrataciones";
DROP TABLE public."postulaciones";
DROP TABLE public."entradas";
DROP TABLE public."tickets";
DROP TABLE public."proyectos_musicales";
DROP TABLE public."eventos";
DROP TABLE public."usuarios";

DROP TYPE public."EstadoOferta";
DROP TYPE public."EstadoContratacion";
DROP TYPE public."EstadoPostulacion";
DROP TYPE public."EstadoEvento";
DROP TYPE public."RolUsuario";

DELETE FROM public."_prisma_migrations";

COMMIT;