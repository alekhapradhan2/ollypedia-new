import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommentReport from "@/models/community/CommentReport";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import "@/models/community/CommunityUser";
import "@/models/Movie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return NextResponse.json(
        { success: false, message: "Admin/moderator access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status !== "all") {
      filter.status = status;
    }

    const [reports, total] = await Promise.all([
      CommentReport.find(filter)
        .populate("reporterId", "username displayName")
        .populate("reportedUserId", "username displayName status")
        .populate("movieId", "title slug posterUrl")
        .populate("threadId", "title slug status content")
        .populate("commentId", "content status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommentReport.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin list reports error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load moderation reports." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return NextResponse.json(
        { success: false, message: "Admin/moderator access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { reportId, targetType, targetId, action } = body;
    // targetType: "comment" | "thread"
    // action: "hide" | "delete" | "restore" | "dismiss_report" | "action_taken"

    if (action === "dismiss_report" && reportId) {
      await CommentReport.findByIdAndUpdate(reportId, { status: "dismissed" });
      return NextResponse.json({ success: true, message: "Report dismissed." });
    }

    if (targetType === "comment" && targetId) {
      if (action === "hide") {
        await DiscussionComment.findByIdAndUpdate(targetId, { status: "hidden" });
      } else if (action === "delete") {
        await DiscussionComment.findByIdAndUpdate(targetId, {
          status: "deleted",
          content: "[Comment removed by moderator]",
        });
      } else if (action === "restore") {
        await DiscussionComment.findByIdAndUpdate(targetId, { status: "active" });
      }
    } else if (targetType === "thread" && targetId) {
      if (action === "hide") {
        await DiscussionThread.findByIdAndUpdate(targetId, { status: "hidden" });
      } else if (action === "delete") {
        await DiscussionThread.findByIdAndUpdate(targetId, { status: "deleted" });
      } else if (action === "restore") {
        await DiscussionThread.findByIdAndUpdate(targetId, { status: "active" });
      }
    }

    if (reportId) {
      await CommentReport.findByIdAndUpdate(reportId, {
        status: action === "restore" ? "reviewed" : "action_taken",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Moderation action "${action}" completed.`,
    });
  } catch (error: any) {
    console.error("Admin moderation action error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process action." },
      { status: 500 }
    );
  }
}
