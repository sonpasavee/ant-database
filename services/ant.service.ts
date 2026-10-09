import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { assertValidTransition } from "@/lib/ant-state-machine";
import type { Prisma } from "@/app/generated/prisma/client";

type ListOptions = {
  page: number;
  limit: number;
  search?: string;
  speciesId?: number;
  locationId?: number;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  userId: string;
  isAdmin: boolean;
};

const includeRelations = {
  species: true,
  location: true,
  collectionMethod: true,
  collectedBy: {
    select: {
      id: true,
      name: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
};

const referenceTransactionOptions = {
  maxWait: 10_000,
  timeout: 15_000,
};

async function resolveLocation(
  tx: Prisma.TransactionClient,
  name: string,
  coordinates?: { latitude?: number | null; longitude?: number | null },
) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new ApiError(400, "LOCATION_REQUIRED", "Location name is required");
  }
  const lockKey = `location:${normalizedName.toLocaleLowerCase("en")}`;
  await tx.$queryRaw<{ acquired: boolean }[]>`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0)) IS NULL AS acquired
  `;
  const matchingLocations = await tx.location.findMany({
    where: { name: { equals: normalizedName, mode: "insensitive" }, province: null },
    orderBy: { id: "asc" },
  });
  if (!coordinates) {
    return matchingLocations[0] ?? tx.location.create({ data: { name: normalizedName } });
  }

  const existing = matchingLocations.find((location) =>
    location.latitude === coordinates.latitude && location.longitude === coordinates.longitude,
  );
  if (existing) return existing;

  const unlocated = matchingLocations.find(
    (location) => location.latitude === null && location.longitude === null,
  );
  if (unlocated) {
    return tx.location.update({
      where: { id: unlocated.id },
      data: coordinates,
    });
  }

  return tx.location.create({ data: { name: normalizedName, ...coordinates } });
}

async function persistSelectedLocationCoordinates(
  tx: Prisma.TransactionClient,
  locationId: number,
  coordinates: { latitude?: number | null; longitude?: number | null },
) {
  if (coordinates.latitude === undefined && coordinates.longitude === undefined) return;

  const location = await tx.location.findUnique({ where: { id: locationId } });
  if (!location) {
    throw new ApiError(400, "LOCATION_NOT_FOUND", "Location does not exist");
  }

  const latitude = coordinates.latitude ?? null;
  const longitude = coordinates.longitude ?? null;
  if (
    location.latitude !== null &&
    location.longitude !== null &&
    (location.latitude !== latitude || location.longitude !== longitude)
  ) {
    throw new ApiError(
      409,
      "LOCATION_COORDINATES_CONFLICT",
      "The selected location coordinates changed. Refresh the location list and try again.",
    );
  }

  if (location.latitude === latitude && location.longitude === longitude) return;
  await tx.location.update({
    where: { id: locationId },
    data: { latitude, longitude },
  });
}

async function resolveCollectionMethod(tx: Prisma.TransactionClient, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new ApiError(400, "COLLECTION_METHOD_REQUIRED", "Collection method name is required");
  }
  const lockKey = `collection-method:${normalizedName.toLocaleLowerCase("en")}`;
  await tx.$queryRaw<{ acquired: boolean }[]>`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0)) IS NULL AS acquired
  `;
  const existing = await tx.collectionMethod.findFirst({
    where: { name: { equals: normalizedName, mode: "insensitive" } },
    orderBy: { id: "asc" },
  });
  return existing ?? tx.collectionMethod.create({ data: { name: normalizedName } });
}

export async function getAntList(options: ListOptions) {
  const { page, limit, search, speciesId, locationId, status, userId, isAdmin } = options;

  const where = {
    ...(speciesId ? { speciesId } : {}),
    ...(locationId ? { locationId } : {}),
    ...(isAdmin
      ? status ? { status } : {}
      : {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { collectedById: userId }] },
            ...(status ? [{ status }] : []),
          ],
        }),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            { species: { is: { commonName: { contains: search, mode: "insensitive" as const } } } },
            { species: { is: { scientificName: { contains: search, mode: "insensitive" as const } } } },
            { species: { is: { aliases: { some: { name: { contains: search, mode: "insensitive" as const } } } } } },
            { location: { is: { name: { contains: search, mode: "insensitive" as const } } } },
            { location: { is: { province: { contains: search, mode: "insensitive" as const } } } },
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

async function ensureReferencesExist(
  data: {
  speciesId?: number | null;
  locationId?: number | null;
  collectionMethodId?: number | null;
  },
) {
  const [species, location, method] = await Promise.all([
    data.speciesId != null
      ? prisma.antSpecies.findUnique({ where: { id: data.speciesId } })
      : Promise.resolve(null),
    data.locationId != null
      ? prisma.location.findUnique({ where: { id: data.locationId } })
      : Promise.resolve(null),
    data.collectionMethodId != null
      ? prisma.collectionMethod.findUnique({ where: { id: data.collectionMethodId } })
      : Promise.resolve(null),
  ]);

  if (data.speciesId != null && !species) {
    throw new ApiError(400, "SPECIES_NOT_FOUND", "Species does not exist");
  }

  if (data.locationId != null && !location) {
    throw new ApiError(400, "LOCATION_NOT_FOUND", "Location does not exist");
  }

  if (data.collectionMethodId != null && !method) {
    throw new ApiError(
      400,
      "COLLECTION_METHOD_NOT_FOUND",
      "Collection method does not exist",
    );
  }
}

export async function createAnt(data: {
  speciesId?: number | null;
  amount: number;
  locationId?: number | null;
  locationName?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  collectionMethodId?: number | null;
  collectionMethodName?: string;
  collectedAt: Date;
  description?: string;
  collectedById: string;
  status: "DRAFT" | "PENDING" | "APPROVED";
  images?: {
    url: string;
    publicId: string;
    caption?: string;
    sortOrder: number;
  }[];
}) {
  await ensureReferencesExist({
    speciesId: data.speciesId,
    locationId: data.locationId,
    collectionMethodId: data.collectionMethodId,
  });

  return prisma.$transaction(async (tx) => {
    const coordinates = data.locationLatitude !== undefined && data.locationLongitude !== undefined
      ? { latitude: data.locationLatitude, longitude: data.locationLongitude }
      : undefined;
    const location = data.locationId != null
      ? { id: data.locationId }
      : data.locationName !== undefined
        ? await resolveLocation(tx, data.locationName, coordinates)
        : null;
    const method = data.collectionMethodId != null
      ? { id: data.collectionMethodId }
      : data.collectionMethodName !== undefined ? await resolveCollectionMethod(tx, data.collectionMethodName) : null;
    if (!location || !method) {
      throw new ApiError(400, "LOCATION_AND_METHOD_REQUIRED", "Location and collection method are required");
    }

    if (data.locationId != null && coordinates) {
      await persistSelectedLocationCoordinates(tx, location.id, coordinates);
    }

    const createData: Prisma.AntRecordCreateInput = {
      amount: data.amount,
      collectedAt: data.collectedAt,
      status: data.status,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.speciesId != null
        ? { species: { connect: { id: data.speciesId } } }
        : {}),
      location: { connect: { id: location.id } },
      collectionMethod: { connect: { id: method.id } },
      collectedBy: { connect: { id: data.collectedById } },
      ...(data.images?.length ? { images: { create: data.images } } : {}),
    };

    return tx.antRecord.create({
      data: createData,
      include: includeRelations,
    });
  }, referenceTransactionOptions);
}

export async function updateAnt(
  id: string,
  data: {
    speciesId?: number | null;
    amount?: number;
    locationId?: number | null;
    locationName?: string;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
    collectionMethodId?: number | null;
    collectionMethodName?: string;
    collectedAt?: Date;
    description?: string;
    images?: {
      url: string;
      publicId: string;
      caption?: string;
      sortOrder: number;
    }[];
  },
) {
  const existing = await getAntById(id);
  const {
    speciesId,
    locationId: requestedLocationId,
    locationName,
    locationLatitude,
    locationLongitude,
    collectionMethodId: requestedMethodId,
    collectionMethodName,
    images,
    ...recordFields
  } = data;

  await ensureReferencesExist({
    speciesId,
    locationId: requestedLocationId,
    collectionMethodId: requestedMethodId,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const coordinates = locationLatitude !== undefined && locationLongitude !== undefined
      ? { latitude: locationLatitude, longitude: locationLongitude }
      : undefined;
    const locationId = requestedLocationId === null && locationName === undefined
      ? null
      : locationName !== undefined
        ? (await resolveLocation(tx, locationName, coordinates ?? undefined)).id
        : requestedLocationId ?? existing.locationId;
    const collectionMethodId =
      requestedMethodId === null && collectionMethodName === undefined
        ? null
        : collectionMethodName !== undefined
          ? (await resolveCollectionMethod(tx, collectionMethodName)).id
          : requestedMethodId ?? existing.collectionMethodId;

    if (requestedLocationId === null && locationName === undefined) {
      throw new ApiError(400, "LOCATION_REQUIRED", "Select or provide a location");
    }
    if (requestedMethodId === null && collectionMethodName === undefined) {
      throw new ApiError(400, "COLLECTION_METHOD_REQUIRED", "Select or provide a collection method");
    }

    if (requestedLocationId !== undefined && requestedLocationId !== null && coordinates) {
      await persistSelectedLocationCoordinates(tx, requestedLocationId, coordinates);
    }

    const updateData: Prisma.AntRecordUpdateInput = {
      ...recordFields,
      ...(speciesId !== undefined
        ? speciesId === null
          ? { species: { disconnect: true } }
          : { species: { connect: { id: speciesId } } }
        : {}),
      ...(requestedLocationId !== undefined || locationName !== undefined
        ? locationId === null
          ? { location: { disconnect: true } }
          : { location: { connect: { id: locationId } } }
        : {}),
      ...(requestedMethodId !== undefined || collectionMethodName !== undefined
        ? collectionMethodId === null
          ? { collectionMethod: { disconnect: true } }
          : { collectionMethod: { connect: { id: collectionMethodId } } }
        : {}),
      ...(images !== undefined
        ? { images: { deleteMany: {}, create: images } }
        : {}),
    };

    if (images !== undefined) {
      const currentImages = await tx.antImage.findMany({
        where: { antRecordId: id },
        select: { publicId: true },
      });
      const retainedPublicIds = new Set(images.map((image) => image.publicId));
      await enqueueCloudinaryImageCleanup(
        tx,
        existing.collectedById,
        currentImages
          .map((image) => image.publicId)
          .filter((publicId) => !retainedPublicIds.has(publicId)),
      );
    }

    return tx.antRecord.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    });
  }, referenceTransactionOptions);

  return updated;
}

export async function deleteAnt(id: string) {
  const existing = await getAntById(id);

  await prisma.$transaction(async (tx) => {
    const images = await tx.antImage.findMany({
      where: { antRecordId: id },
      select: { publicId: true },
    });
    await enqueueCloudinaryImageCleanup(
      tx,
      existing.collectedById,
      images.map((image) => image.publicId),
    );
    await tx.antRecord.delete({ where: { id } });
  });
}

async function enqueueCloudinaryImageCleanup(
  tx: Prisma.TransactionClient,
  userId: string,
  publicIds: string[],
) {
  const ownedPublicIds = [...new Set(publicIds)].filter((publicId) =>
    publicId.startsWith(`ant-database/${userId}/`),
  );
  if (ownedPublicIds.length === 0) return;

  await tx.cloudinaryCleanupJob.createMany({
    data: ownedPublicIds.map((publicId) => ({ publicId })),
    skipDuplicates: true,
  });
}

export async function updateAntStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
  rejectionReason?: string,
  speciesId?: number,
) {
  const existing = await prisma.antRecord.findUnique({
    where: { id },
    select: { status: true, speciesId: true },
  });

  if (!existing) {
    throw new ApiError(404, "ANT_RECORD_NOT_FOUND", "Ant record not found");
  }

  assertValidTransition(existing.status, status);

  if (speciesId !== undefined) {
    await ensureReferencesExist({ speciesId });
  }
  if (status === "APPROVED" && (speciesId ?? existing.speciesId) === null) {
    throw new ApiError(
      400,
      "SPECIES_REQUIRED_FOR_APPROVAL",
      "Identify the ant species before approving this record",
    );
  }

  if (status === "REJECTED" && !rejectionReason) {
    throw new ApiError(
      400,
      "REJECTION_REASON_REQUIRED",
      "Rejection reason is required",
    );
  }

  const updateResult = await prisma.$transaction(async (tx) => {
    return tx.antRecord.updateMany({
      where: {
        id,
        status: existing.status,
      },
      data: {
        status,
        ...(speciesId !== undefined ? { speciesId } : {}),
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });
  }, referenceTransactionOptions);

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
