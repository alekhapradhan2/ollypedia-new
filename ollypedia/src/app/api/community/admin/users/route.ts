import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import { getAuthenticatedUser } from "@/lib/communityAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedUser(req);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q.trim()) {
      filter.$or = [
        { username: { $regex: q.trim(), $options: "i" } },
        { email: { $regex: q.trim(), $options: "i" } },
        { displayName: { $regex: q.trim(), $options: "i" } },
      ];
    }
    if (status) {
      filter.status = status;
    }

    const [users, total] = await Promise.all([
      CommunityUser.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityUser.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to list users." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAuthenticatedUser(req);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { userId, status, role } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const userToUpdate = await CommunityUser.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (status && ["active", "suspended", "deleted"].includes(status)) {
      userToUpdate.status = status;
    }

    if (role && ["user", "moderator", "admin"].includes(role)) {
      userToUpdate.role = role;
    }

    await userToUpdate.save();

    return NextResponse.json({
      success: true,
      message: "User status updated successfully.",
      user: {
        id: userToUpdate._id,
        username: userToUpdate.username,
        status: userToUpdate.status,
        role: userToUpdate.role,
      },
    });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update user." },
      { status: 500 }
    );
  }
}
