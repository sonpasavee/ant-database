import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export async function getLocationList(
  page: number,
  limit: number,
  search?: string,
) {
  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            province: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const [items, total] = await prisma.$transaction([
    prisma.location.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.location.count({
      where,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLocationById(id: number) {
  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new ApiError(404, "LOCATION_NOT_FOUND", "Location not found");
  }

  return location;
}

export async function createLocation(data: {
  name: string;
  province?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}) {
  return prisma.location.create({
    data,
  });
}

export async function updateLocation(
  id: number,
  data: {
    name?: string;
    province?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  await getLocationById(id);

  return prisma.location.update({
    where: { id },
    data,
  });
}

export async function deleteLocation(id: number) {
  await getLocationById(id);

  const count = await prisma.antRecord.count({
    where: {
      locationId: id,
    },
  });

  if (count > 0) {
    throw new ApiError(
      409,
      "LOCATION_IN_USE",
      "Cannot delete location that has ant records",
    );
  }

  await prisma.location.delete({
    where: { id },
  });
}
