import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import MovieVote from "@/models/community/MovieVote";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { getReleaseYear } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "18")));
    const q = searchParams.get("q") || "";
    const filterType = searchParams.get("filter") || "all"; // all | upcoming | released | most_discussed | most_voted
    const genre = searchParams.get("genre");
    const skip = (page - 1) * limit;

    const movieQuery: any = {};
    if (q.trim()) {
      movieQuery.title = { $regex: q.trim(), $options: "i" };
    }
    if (genre) {
      movieQuery.genre = { $in: [genre] };
    }

    let sort: any = { releaseDate: -1, createdAt: -1 };

    if (filterType === "upcoming") {
      movieQuery.$or = [
        { verdict: "Upcoming" },
        { status: "Upcoming" },
        { releaseDate: { $gt: new Date().toISOString() } },
        { releaseTBA: true }
      ];
      sort = { releaseDate: 1, createdAt: -1 };
    } else if (filterType === "released") {
      movieQuery.verdict = { $ne: "Upcoming" };
      sort = { releaseDate: -1, createdAt: -1 };
    }

    const [movies, total] = await Promise.all([
      Movie.find(movieQuery)
        .select(
          "title slug posterUrl thumbnailUrl releaseDate releaseDatePrecision releaseTBA language genre verdict director runtime"
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(movieQuery),
    ]);

    // Aggregate community data for these movies
    const movieIds = movies.map((m: any) => m._id);

    const [voteAgg, threadAgg, commentAgg] = await Promise.all([
      MovieVote.aggregate([
        { $match: { movieId: { $in: movieIds } } },
        {
          $group: {
            _id: { movieId: "$movieId", voteType: "$voteType" },
            count: { $sum: 1 },
          },
        },
      ]),
      DiscussionThread.aggregate([
        { $match: { movieId: { $in: movieIds }, status: "active" } },
        {
          $group: {
            _id: "$movieId",
            count: { $sum: 1 },
            lastActivity: { $max: "$lastActivityAt" },
          },
        },
      ]),
      DiscussionComment.aggregate([
        { $match: { movieId: { $in: movieIds }, status: "active" } },
        {
          $group: {
            _id: "$movieId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const voteStatsMap: Record<string, { total: number; breakdown: Record<string, number> }> = {};
    voteAgg.forEach((v: any) => {
      const mid = v._id.movieId.toString();
      if (!voteStatsMap[mid]) {
        voteStatsMap[mid] = {
          total: 0,
          breakdown: { skip: 0, timepass: 0, go_for_it: 0, perfection: 0 },
        };
      }
      voteStatsMap[mid].breakdown[v._id.voteType] = v.count;
      voteStatsMap[mid].total += v.count;
    });

    const threadStatsMap: Record<string, { count: number; lastActivity: Date | null }> = {};
    threadAgg.forEach((t: any) => {
      threadStatsMap[t._id.toString()] = {
        count: t.count,
        lastActivity: t.lastActivity,
      };
    });

    const commentStatsMap: Record<string, number> = {};
    commentAgg.forEach((c: any) => {
      commentStatsMap[c._id.toString()] = c.count;
    });

    const communityMovies = movies.map((m: any) => {
      const mid = m._id.toString();
      const votes = voteStatsMap[mid] || {
        total: 0,
        breakdown: { skip: 0, timepass: 0, go_for_it: 0, perfection: 0 },
      };
      const threads = threadStatsMap[mid] || { count: 0, lastActivity: null };
      const commentsCount = commentStatsMap[mid] || 0;

      // Determine leading meter sentiment
      let topCategory = "go_for_it";
      let topCount = 0;
      for (const [cat, cnt] of Object.entries(votes.breakdown)) {
        if (cnt > topCount) {
          topCount = cnt;
          topCategory = cat;
        }
      }

      const topPercentage =
        votes.total > 0 ? Math.round((topCount / votes.total) * 100) : 0;

      return {
        ...m,
        community: {
          totalVotes: votes.total,
          breakdown: votes.breakdown,
          topCategory,
          topPercentage,
          threadsCount: threads.count,
          commentsCount,
          lastActivity: threads.lastActivity,
        },
      };
    });

    if (filterType === "most_voted") {
      communityMovies.sort(
        (a: any, b: any) => b.community.totalVotes - a.community.totalVotes
      );
    } else if (filterType === "most_discussed") {
      communityMovies.sort(
        (a: any, b: any) =>
          b.community.threadsCount + b.community.commentsCount -
          (a.community.threadsCount + a.community.commentsCount)
      );
    } else if (filterType === "upcoming") {
      const getDateTier = (m: any): number => {
        const s = String(m.releaseDate || "").trim();
        const prec = m.releaseDatePrecision;

        if (
          m.releaseTBA ||
          !s ||
          s.toUpperCase() === "TBA"
        ) {
          return 4; // Tier 4: TBA (Last)
        }

        // Tier 1: True Full date with Year-Month-Day (e.g. "2026-09-18")
        if (/^\d{4}-\d{2}-\d{2}/.test(s) && prec !== "year" && prec !== "month") {
          return 1;
        }

        // Tier 2: Month & Year (e.g. "2026-09" or prec === "month")
        if (/^\d{4}-\d{2}$/.test(s) || prec === "month") {
          return 2;
        }

        // Tier 3: Year only (e.g. "2026" or prec === "year")
        if (/^\d{4}$/.test(s) || prec === "year") {
          return 3;
        }

        return 4;
      };

      communityMovies.sort((a: any, b: any) => {
        const tierA = getDateTier(a);
        const tierB = getDateTier(b);

        if (tierA !== tierB) {
          return tierA - tierB;
        }

        if (tierA === 4) {
          return 0;
        }

        const timeA = new Date(a.releaseDate).getTime();
        const timeB = new Date(b.releaseDate).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return timeA - timeB;
        }
        return String(a.releaseDate).localeCompare(String(b.releaseDate));
      });
    } else {
      // Default / 'all' / 'released' filter: Sort by year descending, and within year show year-only movies first
      communityMovies.sort((a: any, b: any) => {
        const numYearA = parseInt(getReleaseYear(a.releaseDate) || "0", 10);
        const numYearB = parseInt(getReleaseYear(b.releaseDate) || "0", 10);

        if (numYearA !== numYearB) {
          return numYearB - numYearA;
        }

        const isYearOnlyA = Boolean(
          a.releaseDatePrecision === "year" ||
          (a.releaseDate && /^\d{4}$/.test(String(a.releaseDate).trim()))
        );
        const isYearOnlyB = Boolean(
          b.releaseDatePrecision === "year" ||
          (b.releaseDate && /^\d{4}$/.test(String(b.releaseDate).trim()))
        );

        if (isYearOnlyA && !isYearOnlyB) return -1;
        if (!isYearOnlyA && isYearOnlyB) return 1;

        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
          return dateB - dateA;
        }

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return NextResponse.json({
      success: true,
      movies: communityMovies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Community movies error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load community movies." },
      { status: 500 }
    );
  }
}
