import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionComment from "@/models/community/DiscussionComment";
import DiscussionThread from "@/models/community/DiscussionThread";
import CommentReport from "@/models/community/CommentReport";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { checkRateLimit, sanitizeText } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Login required to report content." },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`report_${user._id}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "You are submitting reports too quickly." },
        { status: 429 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { reason, details, type } = body; // type: "comment" | "thread"

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "Please specify a reason for this report." },
        { status: 400 }
      );
    }

    const isThread = type === "thread";
    let reportedUserId: any = null;
    let movieId: any = null;
    let threadId: any = null;
    let commentId: any = null;

    if (isThread) {
      const thread = await DiscussionThread.findById(params.id);
      if (!thread) {
        return NextResponse.json(
          { success: false, message: "Thread not found." },
          { status: 404 }
        );
      }
      reportedUserId = thread.userId;
      movieId = thread.movieId;
      threadId = thread._id;
    } else {
      const comment = await DiscussionComment.findById(params.id);
      if (!comment) {
        return NextResponse.json(
          { success: false, message: "Comment not found." },
          { status: 404 }
        );
      }
      reportedUserId = comment.userId;
      movieId = comment.movieId;
      threadId = comment.threadId;
      commentId = comment._id;
    }

    await CommentReport.create({
      reporterId: user._id,
      reportedUserId,
      movieId,
      threadId,
      commentId,
      reason,
      details: sanitizeText(String(details || "").slice(0, 500)),
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message:
        "Thank you. Your report has been submitted to the Ollypedia moderation team for review.",
    });
  } catch (error: any) {
    console.error("Submit report error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit report." },
      { status: 500 }
    );
  }
}
