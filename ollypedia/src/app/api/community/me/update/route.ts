import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthenticatedUser, sanitizeUser } from "@/lib/communityAuth";
import { sanitizeText } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { displayName, avatar, bio } = body;

    if (displayName) {
      user.displayName = sanitizeText(displayName.trim().slice(0, 50));
    }
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }
    if (bio !== undefined) {
      user.bio = sanitizeText(String(bio).trim().slice(0, 300));
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
