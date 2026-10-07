import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { registerUser } from "@/services/auth.service";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  email: z.string().trim().email("Invalid email").toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. รับข้อมูลจาก Frontend
    const body = await request.json();

    // 2. Validate
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration data",
            details: result.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    // 3. เรียก Service
    const user = await registerUser(
      result.data.name,
      result.data.email,
      result.data.password,
    );

    // 4. ส่ง Response
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Email is already registered",
          },
        },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong",
        },
      },
      { status: 500 },
    );
  }
}
