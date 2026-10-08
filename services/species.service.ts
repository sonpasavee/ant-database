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
        { aliases: { some: { name: { contains: search, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  // These are independent read queries. Avoid opening a transaction through
  // the hosted database pooler for a list response.
  const items = await prisma.antSpecies.findMany({
    where,
    orderBy: {
      commonName: "asc",
    },
    skip: (page - 1) * limit,
    take: limit,
    include: { aliases: true },
  });
  const total = await prisma.antSpecies.count({ where });

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
    include: { aliases: true },
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
  aliases?: string[];
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

  const { aliases = [], ...speciesData } = data;
  return prisma.antSpecies.create({
    data: {
      ...speciesData,
      aliases: aliases.length ? { create: aliases.map((name) => ({ name })) } : undefined,
    },
    include: { aliases: true },
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
    aliases?: string[];
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

  const { aliases, ...speciesData } = data;
  return prisma.antSpecies.update({
    where: { id },
    data: {
      ...speciesData,
      ...(aliases !== undefined
        ? { aliases: { deleteMany: {}, create: aliases.map((name) => ({ name })) } }
        : {}),
    },
    include: { aliases: true },
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
