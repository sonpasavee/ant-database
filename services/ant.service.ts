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

async function ensureReferencesExist(data: {
  speciesId?: number | null;
  locationId?: number | null;
  collectionMethodId?: number | null;
}) {
  const [species, location, method] = await Promise.all([
    data.speciesId
      ? prisma.antSpecies.findUnique({
      where: {
        id: data.speciesId,
      },
      })
      : Promise.resolve(true),

    data.locationId
      ? prisma.location.findUnique({
      where: {
        id: data.locationId,
      },
      })
      : Promise.resolve(true),

    data.collectionMethodId
      ? prisma.collectionMethod.findUnique({
      where: {
        id: data.collectionMethodId,
      },
      })
      : Promise.resolve(true),
  ]);

  if (data.speciesId && !species) {
    throw new ApiError(400, "SPECIES_NOT_FOUND", "Species does not exist");
  }

  if (data.locationId && !location) {
    throw new ApiError(400, "LOCATION_NOT_FOUND", "Location does not exist");
  }

  if (data.collectionMethodId && !method) {
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
  locationText?: string;
  latitude?: number;
  longitude?: number;
  collectionMethodId?: number | null;
  collectionMethodOther?: string;
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
  await ensureReferencesExist(data);

  return prisma.antRecord.create({
    data: {
      speciesId: data.speciesId,
      amount: data.amount,
      locationId: data.locationId,
      locationText: data.locationText,
      latitude: data.latitude,
      longitude: data.longitude,
      collectionMethodId: data.collectionMethodId,
      collectionMethodOther: data.collectionMethodOther,
      collectedAt: data.collectedAt,
      description: data.description,
      collectedById: data.collectedById,
      status: data.status,
      images: data.images?.length
        ? { create: data.images }
        : undefined,
    },
    include: includeRelations,
  });
}

export async function updateAnt(
  id: string,
  data: {
    speciesId?: number | null;
    amount?: number;
    locationId?: number | null;
    locationText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    collectionMethodId?: number | null;
    collectionMethodOther?: string | null;
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

  if (
    data.speciesId !== undefined ||
    data.locationId !== undefined ||
    data.collectionMethodId !== undefined
  ) {
    await ensureReferencesExist({
      speciesId: data.speciesId ?? existing.speciesId,

      locationId: data.locationId ?? existing.locationId,

      collectionMethodId:
        data.collectionMethodId ?? existing.collectionMethodId,
    });
  }

  const { images, ...recordData } = data;

  const updated = await prisma.antRecord.update({
    where: { id },
    data: {
      ...recordData,
      ...(images !== undefined
        ? { images: { deleteMany: {}, create: images } }
        : {}),
    },
    include: includeRelations,
  });

  if (images !== undefined) {
    const retainedPublicIds = new Set(images.map((image) => image.publicId));
    const removedPublicIds = existing.images
      .map((image) => image.publicId)
      .filter((publicId) => !retainedPublicIds.has(publicId));
    await deleteOwnedCloudinaryImages(existing.collectedById, removedPublicIds);
  }

  return updated;
}

export async function deleteAnt(id: string) {
  const existing = await getAntById(id);

  await prisma.antRecord.delete({
    where: { id },
  });

  await deleteOwnedCloudinaryImages(
    existing.collectedById,
    existing.images.map((image) => image.publicId),
  );
}

async function deleteOwnedCloudinaryImages(userId: string, publicIds: string[]) {
  const ownedPublicIds = publicIds.filter((publicId) =>
    publicId.startsWith(`ant-database/${userId}/`),
  );
  if (ownedPublicIds.length === 0) return;

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const results = await Promise.allSettled(
      ownedPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image" })),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      console.error(`Cloudinary cleanup failed for ${failures.length} ant image(s)`);
    }
  } catch {
    console.error(`Cloudinary cleanup failed for ${ownedPublicIds.length} ant image(s)`);
  }
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

  if (speciesId !== undefined) await ensureReferencesExist({ speciesId });
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

  const updateResult = await prisma.antRecord.updateMany({
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
