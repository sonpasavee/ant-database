import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError } from "./api-error";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
      },
      {
        status: error.statusCode,
      },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        error: "INVALID_JSON",
        message: "Request body must be valid JSON",
      },
      {
        status: 400,
      },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
    {
      status: 500,
    },
  );
}
