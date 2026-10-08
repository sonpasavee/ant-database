import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { assertValidTransition } from "@/lib/ant-state-machine";

type ListOptions = {
  page: number;
  limit: number;
  search?: string;
  speciesId?: number;
  locationId?: number;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
};

const includeRelations = {
  species: true,
  location: true,
  collectionMethod: true,
  collectedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
};

export async function getAntList(options: ListOptions) {
  const { page, limit, search, speciesId, locationId, status } = options;

  const where = {
    ...(speciesId ? { speciesId } : {}),

    ...(locationId ? { locationId } : {}),

    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              species: {
                commonName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              species: {
                scientificName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              location: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.antRecord.findMany({
      where,
      include: includeRelations,
      orderBy: {
        collectedAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.antRecord.count({
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

export async function getAntById(id: string) {
  const record = await prisma.antRecord.findUnique({
    where: { id },
    include: includeRelations,
  });

  if (!record) {
    throw new ApiError(404, "ANT_RECORD_NOT_FOUND", "Ant record not found");
  }

  return record;
}

async function ensureReferencesExist(data: {
  speciesId: number;
  locationId: number;
  collectionMethodId: number;
}) {
  const [species, location, method] = await Promise.all([
    prisma.antSpecies.findUnique({
      where: {
        id: data.speciesId,
      },
    }),

    prisma.location.findUnique({
      where: {
        id: data.locationId,
      },
    }),

    prisma.collectionMethod.findUnique({
      where: {
        id: data.collectionMethodId,
      },
    }),
  ]);

  if (!species) {
    throw new ApiError(400, "SPECIES_NOT_FOUND", "Species does not exist");
  }

  if (!location) {
    throw new ApiError(400, "LOCATION_NOT_FOUND", "Location does not exist");
  }

  if (!method) {
    throw new ApiError(
      400,
      "COLLECTION_METHOD_NOT_FOUND",
      "Collection method does not exist",
    );
  }
}

export async function createAnt(data: {
  speciesId: number;
  amount: number;
  locationId: number;
  collectionMethodId: number;
  collectedAt: Date;
  description?: string;
  collectedById: string;
  status: "PENDING" | "APPROVED";
}) {
  await ensureReferencesExist(data);

  return prisma.antRecord.create({
    data: {
      speciesId: data.speciesId,
      amount: data.amount,
      locationId: data.locationId,
      collectionMethodId: data.collectionMethodId,
      collectedAt: data.collectedAt,
      description: data.description,
      collectedById: data.collectedById,
      status: data.status,
    },
    include: includeRelations,
  });
}

export async function updateAnt(
  id: string,
  data: {
    speciesId?: number;
    amount?: number;
    locationId?: number;
    collectionMethodId?: number;
    collectedAt?: Date;
    description?: string;
  },
) {
  const existing = await getAntById(id);

  if (data.speciesId || data.locationId || data.collectionMethodId) {
    await ensureReferencesExist({
      speciesId: data.speciesId ?? existing.speciesId,

      locationId: data.locationId ?? existing.locationId,

      collectionMethodId:
        data.collectionMethodId ?? existing.collectionMethodId,
    });
  }

  return prisma.antRecord.update({
    where: { id },
    data,
    include: includeRelations,
  });
}

export async function deleteAnt(id: string) {
  await getAntById(id);

  await prisma.antRecord.delete({
    where: { id },
  });
}

export async function updateAntStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
  rejectionReason?: string,
) {
  const existing = await prisma.antRecord.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existing) {
    throw new ApiError(404, "ANT_RECORD_NOT_FOUND", "Ant record not found");
  }

  assertValidTransition(existing.status, status);

  if (status === "REJECTED" && !rejectionReason) {
    throw new ApiError(
      400,
      "REJECTION_REASON_REQUIRED",
      "Rejection reason is required",
    );
  }

  const updateResult = await prisma.antRecord.updateMany({
    where: {
      id,
      status: existing.status,
    },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
    },
  });

  if (updateResult.count !== 1) {
    const current = await prisma.antRecord.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!current) {
      throw new ApiError(404, "ANT_RECORD_NOT_FOUND", "Ant record not found");
    }

    assertValidTransition(current.status, status);
    throw new ApiError(
      409,
      "STATUS_CHANGED_CONCURRENTLY",
      "Ant record status changed before this update was applied",
    );
  }

  return getAntById(id);
}
