import { ApiError } from "@/lib/api-error";

type RecordStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

const transition: Record<RecordStatus, RecordStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["PENDING"],
};

export function canTransition(from: RecordStatus, to: RecordStatus) {
  return transition[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: RecordStatus, to: RecordStatus) {
  if (!canTransition(from, to)) {
    throw new ApiError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot change status from ${from} to ${to}`,
    );
  }
}
