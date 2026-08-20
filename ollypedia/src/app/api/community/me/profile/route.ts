import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthenticatedUser, sanitizeUser } from "@/lib/communityAuth";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import MovieVote from "@/models/community/MovieVote";
import CommunityActivity from "@/models/community/CommunityActivity";
import "@/models/Movie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectDB();

    const [discussions, comments, votes, activities] = await Promise.all([
      DiscussionThread.find({ userId: user._id })
        .populate("movieId", "title slug posterUrl thumbnailUrl releaseDate")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      DiscussionComment.find({ userId: user._id })
        .populate("movieId", "title slug posterUrl thumbnailUrl")
        .populate("threadId", "title slug")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      MovieVote.find({ userId: user._id })
        .populate("movieId", "title slug posterUrl thumbnailUrl releaseDate genre verdict")
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean(),
      CommunityActivity.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      discussions,
      comments,
      votes,
      activities,
    });
  } catch (error: any) {
    console.error("Fetch me profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
