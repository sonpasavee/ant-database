import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export type SpeciesListOptions = {
  page: number;
  limit: number;
  search?: string;
};

export async function getSpeciesList({ page, limit, search }: SpeciesListOptions) {
  const where = search
    ? {
        OR: [
          { commonName: { contains: search, mode: "insensitive" as const } },
          { scientificName: { contains: search, mode: "insensitive" as const } },
          { genus: { contains: search, mode: "insensitive" as const } },
          { aliases: { some: { name: { contains: search, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const items = await prisma.antSpecies.findMany({
    where,
    orderBy: { commonName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    include: { aliases: true },
  });
  const total = await prisma.antSpecies.count({ where });

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSpeciesById(id: number) {
  const species = await prisma.antSpecies.findUnique({
    where: { id },
    include: { aliases: true },
  });
  if (!species) throw new ApiError(404, "SPECIES_NOT_FOUND", "Species not found");
  return species;
}
