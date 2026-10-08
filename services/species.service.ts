import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export type SpeciesListOptions = {
  page: number;
  limit: number;
  search?: string;
};

export async function getSpeciesList(options: SpeciesListOptions) {
  const { page, limit, search } = options;

  const where = search
    ? {
        OR: [
          {
            commonName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            scientificName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            genus: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const [items, total] = await prisma.$transaction([
    prisma.antSpecies.findMany({
      where,
      orderBy: {
        commonName: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.antSpecies.count({ where }),
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

export async function getSpeciesById(id: number) {
  const species = await prisma.antSpecies.findUnique({
    where: { id },
  });
  if (!species) {
    throw new ApiError(404, "SPECIES_NOT_FOUND", "Species not found");
  }
  return species;
}

export async function createSpecies(data: {
  commonName: string;
  scientificName: string;
  genus?: string;
  family?: string;
  description?: string;
}) {
  const existing = await prisma.antSpecies.findUnique({
    where: {
      scientificName: data.scientificName,
    },
  });

  if (existing) {
    throw new ApiError(
      409,
      "SPECIES_ALREADY_EXISTS",
      "Scientific name already exists",
    );
  }

  return prisma.antSpecies.create({
    data,
  });
}

export async function updateSpecies(
  id: number,
  data: {
    commonName?: string;
    scientificName?: string;
    genus?: string;
    family?: string;
    description?: string;
  },
) {
  await getSpeciesById(id);

  if (data.scientificName) {
    const duplicate = await prisma.antSpecies.findFirst({
      where: {
        scientificName: data.scientificName,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ApiError(
        409,
        "SPECIES_ALREADY_EXISTS",
        "Scientific name already exists",
      );
    }
  }

  return prisma.antSpecies.update({
    where: { id },
    data,
  });
}

export async function deleteSpecies(id: number) {
  await getSpeciesById(id);

  const recordCount = await prisma.antRecord.count({
    where: {
      speciesId: id,
    },
  });

  if (recordCount > 0) {
    throw new ApiError(
      409,
      "SPECIES_IN_USE",
      "Cannot delete species that has ant records",
    );
  }

  return prisma.antSpecies.delete({
    where: { id },
  });
}
