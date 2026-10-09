import { errorResponse } from "@/lib/api-response";
import { processCloudinaryCleanupBatch } from "@/services/cloudinary-cleanup.service";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return Response.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Cleanup scheduler is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const result = await processCloudinaryCleanupBatch();
    return Response.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
