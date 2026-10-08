import { ApiError } from "./api-error";
import type { Role } from "@/app/generated/prisma/enums";
import type { Session } from "next-auth";

export type CurrentUser = {
  id: string;
  role: Role;
};

export async function requireUser(
  auth: () => Promise<Session | null>,
): Promise<CurrentUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
}

export function requireAdmin(user: CurrentUser) {
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Admin permission required");
  }
}

export function requireOwnerOrAdmin(user: CurrentUser, ownerId: string) {
  if (user.role !== "ADMIN" && user.id !== ownerId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to modify this resource",
    );
  }
}
