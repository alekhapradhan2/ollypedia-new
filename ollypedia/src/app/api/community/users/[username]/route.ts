import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import MovieVote from "@/models/community/MovieVote";
import { sanitizePublicUser } from "@/lib/communityAuth";
import "@/models/Movie"; // Ensure Movie model is loaded for references

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await connectDB();
    const username = params.username.toLowerCase().trim();

    const user = await CommunityUser.findOne({
      username,
      status: { $ne: "deleted" },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Community user not found." },
        { status: 404 }
      );
    }

    const [discussions, comments, userVotes] = await Promise.all([
      DiscussionThread.find({ userId: user._id, status: "active" })
        .populate("movieId", "title slug posterUrl thumbnailUrl")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      DiscussionComment.find({ userId: user._id, status: "active" })
        .populate("movieId", "title slug posterUrl thumbnailUrl")
        .populate("threadId", "title slug")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      MovieVote.find({ userId: user._id })
        .populate("movieId", "title slug posterUrl thumbnailUrl releaseDate")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // Unique movies participated in across threads, comments, and votes
    const participatedMovieMap = new Map<string, any>();
    discussions.forEach((d: any) => {
      if (d.movieId?._id) participatedMovieMap.set(d.movieId._id.toString(), d.movieId);
    });
    comments.forEach((c: any) => {
      if (c.movieId?._id) participatedMovieMap.set(c.movieId._id.toString(), c.movieId);
    });
    userVotes.forEach((v: any) => {
      if (v.movieId?._id) participatedMovieMap.set(v.movieId._id.toString(), v.movieId);
    });

    const participatedMovies = Array.from(participatedMovieMap.values());

    return NextResponse.json({
      success: true,
      user: sanitizePublicUser(user),
      discussions,
      comments,
      participatedMovies,
    });
  } catch (error: any) {
    console.error("Fetch user profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user profile." },
      { status: 500 }
    );
  }
}
