import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/auth";
import { getAntImageFolder } from "@/lib/ant-image-security";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        {
          error: "UNAUTHORIZED",
          message: "Authentication required",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    const { paramsToSign } = body;

    if (
      !paramsToSign ||
      typeof paramsToSign !== "object" ||
      Array.isArray(paramsToSign)
    ) {
      return Response.json(
        {
          error: "INVALID_PARAMS",
          message: "Upload signature parameters are invalid",
        },
        {
          status: 400,
        },
      );
    }

    const allowedKeys = new Set(["timestamp", "folder", "source"]);
    const keys = Object.keys(paramsToSign);
    const timestamp = Number(paramsToSign.timestamp);
    const expectedFolder = getAntImageFolder(session.user.id);
    const now = Math.floor(Date.now() / 1000);
    const validParams =
      keys.length > 0 &&
      keys.every((key) => allowedKeys.has(key)) &&
      Number.isInteger(timestamp) &&
      Math.abs(now - timestamp) <= 5 * 60 &&
      paramsToSign.folder === expectedFolder &&
      (paramsToSign.source === undefined || paramsToSign.source === "uw");

    if (!validParams) {
      return Response.json(
        {
          error: "INVALID_PARAMS",
          message: "Only recent uploads to your own image folder are allowed",
        },
        { status: 400 },
      );
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      throw new Error("Cloudinary API secret is not configured");
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret,
    );

    return Response.json({
      signature,
    });
  } catch (error) {
    console.error("Cloudinary signature error:", error);

    return Response.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate upload signature",
      },
      {
        status: 500,
      },
    );
  }
}
