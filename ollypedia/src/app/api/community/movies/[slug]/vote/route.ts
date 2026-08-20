import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import MovieVote, { VoteType } from "@/models/community/MovieVote";
import CommunityUser from "@/models/community/CommunityUser";
import CommunityActivity from "@/models/community/CommunityActivity";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { checkRateLimit } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

const VALID_VOTES: VoteType[] = ["skip", "timepass", "go_for_it", "perfection"];

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          message: "Login required to vote on the Ollypedia Meter.",
        },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`vote_${user._id}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "You are voting too quickly. Please slow down." },
        { status: 429 }
      );
    }

    await connectDB();
    const slug = params.slug;
    const body = await req.json();
    const { voteType } = body;

    if (!VALID_VOTES.includes(voteType)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid vote option. Choose from: skip, timepass, go_for_it, perfection.",
        },
        { status: 400 }
      );
    }

    const movie = (await Movie.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    })
      .select("_id title slug")
      .lean()) as any;

    if (!movie) {
      return NextResponse.json(
        { success: false, message: "Movie not found." },
        { status: 404 }
      );
    }

    const movieId = movie._id;

    // Check if user already has an active vote
    const existingVote = await MovieVote.findOne({
      userId: user._id,
      movieId,
    });

    let isNewVote = false;
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Same vote clicked again — keep as is
      } else {
        existingVote.voteType = voteType;
        await existingVote.save();

        await CommunityActivity.create({
          userId: user._id,
          movieId,
          type: "CHANGE_VOTE",
          referenceId: existingVote._id,
          metadata: {
            movieTitle: movie.title,
            movieSlug: movie.slug,
            voteType,
            snippet: `Changed vote to "${voteType.replace(/_/g, " ")}" for ${movie.title}`,
          },
        });
      }
    } else {
      isNewVote = true;
      const newVote = await MovieVote.create({
        userId: user._id,
        movieId,
        voteType,
      });

      await CommunityUser.findByIdAndUpdate(user._id, {
        $inc: { voteCount: 1 },
      });

      await CommunityActivity.create({
        userId: user._id,
        movieId,
        type: "VOTE_MOVIE",
        referenceId: newVote._id,
        metadata: {
          movieTitle: movie.title,
          movieSlug: movie.slug,
          voteType,
          snippet: `Voted "${voteType.replace(/_/g, " ")}" on ${movie.title}`,
        },
      });
    }

    // Re-aggregate and return latest meter stats
    const voteAgg = await MovieVote.aggregate([
      { $match: { movieId } },
      { $group: { _id: "$voteType", count: { $sum: 1 } } },
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
      userVote: voteType,
    };

    return NextResponse.json({
      success: true,
      message: isNewVote
        ? "Your vote has been counted!"
        : "Your vote has been updated!",
      meter: meterData,
    });
  } catch (error: any) {
    console.error("Cast vote error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to record your vote." },
      { status: 500 }
    );
  }
}
