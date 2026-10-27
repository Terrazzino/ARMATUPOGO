import { describe, expect, it } from "vitest";
import { projectToFormValues } from "@/lib/project-form-values";
import { projectCreateData, projectUpdateData } from "@/lib/project-access";
import { proyectoMusicalSchema } from "@/lib/validations/projects";

describe("valores iniciales del formulario de proyecto", () => {
  it("separa el id de los campos editables antes del resolver estricto", () => {
    const persistedProject = {
      id: crypto.randomUUID(),
      nombre: "Proyecto existente",
      genero: "Rock",
      descripcion: "Con imagen",
      imagenUrl: "https://example.test/logo.webp",
      enlacesPersonalizados: [],
    };

    expect(() => proyectoMusicalSchema.parse(persistedProject)).toThrow(/id|unrecognized/i);

    const formValues = projectToFormValues(persistedProject);
    expect(formValues).not.toHaveProperty("id");
    expect(proyectoMusicalSchema.parse(formValues)).toEqual(formValues);
  });

  it("descarta propiedades de Prisma o relaciones no editables", () => {
    const formValues = projectToFormValues({
      id: crypto.randomUUID(),
      nombre: "Proyecto",
      genero: "Punk",
      usuario: { id: crypto.randomUUID() },
      creadoEn: new Date(),
    } as Parameters<typeof projectToFormValues>[0] & {
      usuario: { id: string };
      creadoEn: Date;
    });

    expect(formValues).not.toHaveProperty("usuario");
    expect(formValues).not.toHaveProperty("creadoEn");
    expect(proyectoMusicalSchema.safeParse(formValues).success).toBe(true);
  });

  it("omite la ubicación histórica para preservarla durante la edición", () => {
    const formValues = projectToFormValues({
      id: crypto.randomUUID(),
      nombre: "Proyecto con historia",
      genero: "Rock",
      ubicacion: "Almagro",
      ciudad: "CABA",
    });

    expect(formValues).not.toHaveProperty("ubicacion");
    expect(projectUpdateData(formValues)).not.toHaveProperty("ubicacion");
    expect(formValues.ciudad).toBe("CABA");
  });

  it("permite crear sin ubicación y la persiste como dato ausente", () => {
    const formValues = {
      ...projectToFormValues(),
      nombre: "Proyecto nuevo",
      genero: "Punk",
    };

    expect(formValues).not.toHaveProperty("ubicacion");
    expect(proyectoMusicalSchema.safeParse(formValues).success).toBe(true);
    expect(projectCreateData(crypto.randomUUID(), formValues).ubicacion).toBeNull();
  });
});
