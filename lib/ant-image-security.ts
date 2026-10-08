import { ApiError } from "@/lib/api-error";

export type AntImageInput = { url: string; publicId: string };

export function getAntImageFolder(userId: string) {
  return `ant-database/${userId}`;
}

export function assertOwnedAntImages(
  images: AntImageInput[] | undefined,
  userId: string,
  previouslyAttachedPublicIds: Iterable<string> = [],
) {
  const existingIds = new Set(previouslyAttachedPublicIds);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  for (const image of images ?? []) {
    let url: URL;
    try {
      url = new URL(image.url);
    } catch {
      throw new ApiError(400, "INVALID_IMAGE", "Image URL is invalid");
    }

    const isCloudinaryImage =
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      Boolean(cloudName) &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      url.pathname.includes("/image/upload/") &&
      new RegExp(`/${escapeRegExp(image.publicId)}(?:\\.[a-zA-Z0-9]+)?$`).test(url.pathname);
    const isOwnedUpload = image.publicId.startsWith(`${getAntImageFolder(userId)}/`);

    if (!isCloudinaryImage || (!isOwnedUpload && !existingIds.has(image.publicId))) {
      throw new ApiError(400, "INVALID_IMAGE", "Only your uploaded Cloudinary images can be attached");
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
