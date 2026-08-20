import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionComment from "@/models/community/DiscussionComment";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { sanitizeText } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

// Edit Comment
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectDB();
    const comment = await DiscussionComment.findById(params.id);
    if (!comment || comment.status === "deleted") {
      return NextResponse.json(
        { success: false, message: "Comment not found." },
        { status: 404 }
      );
    }

    // Verify authorship or admin
    if (
      comment.userId.toString() !== user._id.toString() &&
      user.role !== "admin" &&
      user.role !== "moderator"
    ) {
      return NextResponse.json(
        { success: false, message: "You can only edit your own comment." },
        { status: 403 }
      );
    }

    const body = await req.json();
    let { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Comment cannot be empty." },
        { status: 400 }
      );
    }

    content = sanitizeText(content.trim());
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Comment exceeds 2000 characters." },
        { status: 400 }
      );
    }

    comment.content = content;
    comment.editedAt = new Date();
    await comment.save();

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully.",
      comment,
    });
  } catch (error: any) {
    console.error("Edit comment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update comment." },
      { status: 500 }
    );
  }
}

// Soft Delete Comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectDB();
    const comment = await DiscussionComment.findById(params.id);
    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment not found." },
        { status: 404 }
      );
    }

    if (
      comment.userId.toString() !== user._id.toString() &&
      user.role !== "admin" &&
      user.role !== "moderator"
    ) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own comment." },
        { status: 403 }
      );
    }

    comment.status = "deleted";
    comment.content = "[Comment deleted by user]";
    await comment.save();

    return NextResponse.json({
      success: true,
      message: "Comment deleted.",
    });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete comment." },
      { status: 500 }
    );
  }
}
