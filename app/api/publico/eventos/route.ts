import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-helpers";
import {
  publicEventListSelect,
  publicEventListWhere,
} from "@/lib/event-access";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("ciudad") || searchParams.get("city");
    const search = searchParams.get("search") || searchParams.get("q");

    const events = await prisma.evento.findMany({
      where: publicEventListWhere(new Date(), { city, search }),
      orderBy: { startsAt: "asc" },
      select: publicEventListSelect,
    });

    return Response.json(events, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
