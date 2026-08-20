import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import MovieVote from "@/models/community/MovieVote";
import CommentReport from "@/models/community/CommentReport";
import { getAuthenticatedUser } from "@/lib/communityAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalThreads,
      totalComments,
      totalVotes,
      pendingReports,
      todayUsers,
      todayThreads,
      todayComments,
      todayVotes,
    ] = await Promise.all([
      CommunityUser.countDocuments({ status: { $ne: "deleted" } }),
      CommunityUser.countDocuments({ status: "active" }),
      DiscussionThread.countDocuments({ status: "active" }),
      DiscussionComment.countDocuments({ status: "active" }),
      MovieVote.countDocuments(),
      CommentReport.countDocuments({ status: "pending" }),
      CommunityUser.countDocuments({ createdAt: { $gte: startOfToday } }),
      DiscussionThread.countDocuments({ createdAt: { $gte: startOfToday } }),
      DiscussionComment.countDocuments({ createdAt: { $gte: startOfToday } }),
      MovieVote.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalThreads,
        totalComments,
        totalVotes,
        pendingReports,
        todayUsers,
        todayThreads,
        todayComments,
        todayVotes,
      },
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load admin stats." },
      { status: 500 }
    );
  }
}
