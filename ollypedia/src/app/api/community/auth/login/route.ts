import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import {
  comparePassword,
  signToken,
  setAuthCookie,
  sanitizeUser,
} from "@/lib/communityAuth";
import { checkRateLimit } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client";
    const rl = checkRateLimit(`login_${ip}`, 15, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many login attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    await connectDB();
    const body = await req.json();
    let { identifier, password } = body; // identifier can be username or email

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both username/email and password." },
        { status: 400 }
      );
    }

    identifier = identifier.trim().toLowerCase();

    const user = await CommunityUser.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { success: false, message: "Your account is currently suspended. Please contact support." },
        { status: 403 }
      );
    }

    if (user.status === "deleted") {
      return NextResponse.json(
        { success: false, message: "This account has been deleted." },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status,
    });

    const sanitized = sanitizeUser(user);
    const response = NextResponse.json(
      {
        success: true,
        message: `Welcome back, ${user.displayName}!`,
        user: sanitized,
        token,
      },
      { status: 200 }
    );

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Community login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to log in." },
      { status: 500 }
    );
  }
}
