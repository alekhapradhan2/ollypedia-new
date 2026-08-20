import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import DiscussionThread from "@/models/community/DiscussionThread";
import ThreadLike from "@/models/community/ThreadLike";
import CommunityUser from "@/models/community/CommunityUser";
import CommunityActivity from "@/models/community/CommunityActivity";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import {
  checkRateLimit,
  sanitizeText,
  generateSlug,
} from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    const slug = params.slug;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(25, Math.max(1, parseInt(searchParams.get("limit") || "15")));
    const sort = searchParams.get("sort") || "latest"; // latest | popular | most_commented | trending
    const skip = (page - 1) * limit;

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
    const filter = { movieId, status: "active" };

    let sortOption: any = { createdAt: -1 };
    if (sort === "popular") {
      sortOption = { likeCount: -1, createdAt: -1 };
    } else if (sort === "most_commented") {
      sortOption = { commentCount: -1, createdAt: -1 };
    } else if (sort === "trending") {
      sortOption = { lastActivityAt: -1, createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const [threads, total] = await Promise.all([
      DiscussionThread.find(filter)
        .populate("userId", "username displayName avatar role status")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      DiscussionThread.countDocuments(filter),
    ]);

    // Check liked state if user is logged in
    const currentUser = await getAuthenticatedUser(req);
    let likedThreadIds = new Set<string>();
    if (currentUser && threads.length > 0) {
      const threadIds = threads.map((t: any) => t._id);
      const likes = await ThreadLike.find({
        userId: currentUser._id,
        threadId: { $in: threadIds },
      }).lean();
      likedThreadIds = new Set(likes.map((l: any) => l.threadId.toString()));
    }

    const enrichedThreads = threads.map((t: any) => ({
      ...t,
      isLiked: likedThreadIds.has(t._id.toString()),
    }));

    return NextResponse.json({
      success: true,
      threads: enrichedThreads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch threads error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load discussions." },
      { status: 500 }
    );
  }
}

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
          message: "You must be logged in to start a discussion thread.",
        },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`new_thread_${user._id}`, 10, 60 * 60 * 1000); // 10 threads per hr
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Thread creation limit reached. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();
    const slug = params.slug;
    const body = await req.json();
    let { title, content, hasSpoiler } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required." },
        { status: 400 }
      );
    }

    title = sanitizeText(title.trim());
    content = sanitizeText(content.trim());

    if (title.length < 5 || title.length > 150) {
      return NextResponse.json(
        { success: false, message: "Title must be between 5 and 150 characters." },
        { status: 400 }
      );
    }

    if (content.length < 10 || content.length > 5000) {
      return NextResponse.json(
        { success: false, message: "Content must be between 10 and 5000 characters." },
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

    const threadSlug = generateSlug(title);

    const newThread = await DiscussionThread.create({
      movieId: movie._id,
      userId: user._id,
      title,
      content,
      slug: threadSlug,
      hasSpoiler: Boolean(hasSpoiler),
      status: "active",
      lastActivityAt: new Date(),
    });

    await CommunityUser.findByIdAndUpdate(user._id, {
      $inc: { discussionCount: 1 },
    });

    await CommunityActivity.create({
      userId: user._id,
      movieId: movie._id,
      type: "CREATE_THREAD",
      referenceId: newThread._id,
      metadata: {
        movieTitle: movie.title,
        movieSlug: movie.slug,
        threadTitle: title,
        threadSlug,
        snippet: content.slice(0, 100),
      },
    });

    const populated = await DiscussionThread.findById(newThread._id)
      .populate("userId", "username displayName avatar role status")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Discussion thread created successfully!",
        thread: populated,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create discussion." },
      { status: 500 }
    );
  }
}
