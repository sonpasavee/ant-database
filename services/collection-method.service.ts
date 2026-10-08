import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export async function getCollectionMethodList(
  page: number,
  limit: number,
  search?: string,
) {
  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }
    : {};

  const [items, total] = await prisma.$transaction([
    prisma.collectionMethod.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.collectionMethod.count({
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

export async function getCollectionMethodById(id: number) {
  const method = await prisma.collectionMethod.findUnique({
    where: { id },
  });

  if (!method) {
    throw new ApiError(
      404,
      "COLLECTION_METHOD_NOT_FOUND",
      "Collection method not found",
    );
  }

  return method;
}

export async function createCollectionMethod(data: {
  name: string;
  description?: string;
}) {
  const existing = await prisma.collectionMethod.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existing) {
    throw new ApiError(
      409,
      "COLLECTION_METHOD_ALREADY_EXISTS",
      "Collection method already exists",
    );
  }

  return prisma.collectionMethod.create({
    data,
  });
}

export async function updateCollectionMethod(
  id: number,
  data: {
    name?: string;
    description?: string;
  },
) {
  await getCollectionMethodById(id);

  if (data.name) {
    const duplicate = await prisma.collectionMethod.findFirst({
      where: {
        name: data.name,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ApiError(
        409,
        "COLLECTION_METHOD_ALREADY_EXISTS",
        "Collection method already exists",
      );
    }
  }

  return prisma.collectionMethod.update({
    where: { id },
    data,
  });
}

export async function deleteCollectionMethod(id: number) {
  await getCollectionMethodById(id);

  const count = await prisma.antRecord.count({
    where: {
      collectionMethodId: id,
    },
  });

  if (count > 0) {
    throw new ApiError(
      409,
      "COLLECTION_METHOD_IN_USE",
      "Cannot delete collection method that has ant records",
    );
  }

  await prisma.collectionMethod.delete({
    where: { id },
  });
}
