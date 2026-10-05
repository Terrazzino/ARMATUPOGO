import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-helpers";
import { publicProjectListSelect, publicProjectWhere } from "@/lib/project-access";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genero = searchParams.get("genero") || searchParams.get("genre");
    const ciudad = searchParams.get("ciudad") || searchParams.get("city");
    const search = searchParams.get("search") || searchParams.get("q");

    const projects = await prisma.proyectoMusical.findMany({
      where: publicProjectWhere({ genre: genero, city: ciudad, search }),
      orderBy: { creadoEn: "desc" },
      select: publicProjectListSelect,
    });

    return Response.json(projects, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

