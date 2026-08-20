import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionComment from "@/models/community/DiscussionComment";
import CommentLike from "@/models/community/CommentLike";
import CommunityUser from "@/models/community/CommunityUser";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { checkRateLimit } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          message: "Login required to like a comment.",
        },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`like_comment_${user._id}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many like requests." },
        { status: 429 }
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

    const existingLike = await CommentLike.findOne({
      userId: user._id,
      commentId: comment._id,
    });

    let isLiked = false;
    if (existingLike) {
      await CommentLike.deleteOne({ _id: existingLike._id });
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      await comment.save();

      await CommunityUser.findByIdAndUpdate(comment.userId, {
        $inc: { likesReceived: -1 },
      });
      isLiked = false;
    } else {
      await CommentLike.create({
        userId: user._id,
        commentId: comment._id,
      });
      comment.likeCount += 1;
      await comment.save();

      await CommunityUser.findByIdAndUpdate(comment.userId, {
        $inc: { likesReceived: 1 },
      });
      isLiked = true;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount: comment.likeCount,
    });
  } catch (error: any) {
    console.error("Toggle comment like error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update like." },
      { status: 500 }
    );
  }
}
