import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import MovieVote from "@/models/community/MovieVote";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { getAuthenticatedUser } from "@/lib/communityAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    const slug = params.slug;

    // Support lookup by slug or ID
    const movie = (await Movie.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    })
      .select("title slug posterUrl thumbnailUrl releaseDate language genre verdict")
      .lean()) as any;

    if (!movie) {
      return NextResponse.json(
        { success: false, message: "Movie not found." },
        { status: 404 }
      );
    }

    const movieId = movie._id;

    // Check if user is logged in
    const user = await getAuthenticatedUser(req);
    let userVote: string | null = null;
    if (user) {
      const activeVote = (await MovieVote.findOne({
        userId: user._id,
        movieId,
      }).lean()) as any;
      if (activeVote) {
        userVote = activeVote.voteType;
      }
    }

    // Aggregate votes
    const [voteAgg, threadsCount, commentsCount, distinctVoters] =
      await Promise.all([
        MovieVote.aggregate([
          { $match: { movieId } },
          { $group: { _id: "$voteType", count: { $sum: 1 } } },
        ]),
        DiscussionThread.countDocuments({ movieId, status: "active" }),
        DiscussionComment.countDocuments({ movieId, status: "active" }),
        MovieVote.distinct("userId", { movieId }),
      ]);

    const counts: Record<string, number> = {
      skip: 0,
      timepass: 0,
      go_for_it: 0,
      perfection: 0,
    };

    let totalVotes = 0;
    voteAgg.forEach((item: any) => {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
        totalVotes += item.count;
      }
    });

    const calculatePercentage = (count: number) => {
      if (totalVotes === 0) return 0;
      return Math.round((count / totalVotes) * 100);
    };

    const meterData = {
      totalVotes,
      skip: {
        count: counts.skip,
        percentage: calculatePercentage(counts.skip),
      },
      timepass: {
        count: counts.timepass,
        percentage: calculatePercentage(counts.timepass),
      },
      goForIt: {
        count: counts.go_for_it,
        percentage: calculatePercentage(counts.go_for_it),
      },
      perfection: {
        count: counts.perfection,
        percentage: calculatePercentage(counts.perfection),
      },
      userVote,
      participantsCount: distinctVoters.length,
      threadsCount,
      commentsCount,
    };

    return NextResponse.json({
      success: true,
      movie,
      meter: meterData,
    });
  } catch (error: any) {
    console.error("Fetch meter error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load Ollypedia Meter data." },
      { status: 500 }
    );
  }
}
