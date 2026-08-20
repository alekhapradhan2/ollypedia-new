import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import DiscussionComment from "@/models/community/DiscussionComment";
import CommentLike from "@/models/community/CommentLike";
import CommunityUser from "@/models/community/CommunityUser";
import CommunityActivity from "@/models/community/CommunityActivity";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { sanitizeText, checkRateLimit } from "@/lib/communityHelpers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    const slug = params.slug;
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "top"; // top | newest | oldest
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "25")));
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

    // Get current user if logged in to check likes
    const user = await getAuthenticatedUser(req);
    const currentUserId = user?._id?.toString() || null;

    let sortObj: any = { likeCount: -1, createdAt: -1 };
    if (sort === "newest") {
      sortObj = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortObj = { createdAt: 1 };
    }

    // Find direct top-level comments on this movie (where threadId is null or parentCommentId is null)
    const [rootComments, total] = await Promise.all([
      DiscussionComment.find({
        movieId: movie._id,
        threadId: null,
        parentCommentId: null,
        status: { $ne: "deleted" },
      })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate("userId", "displayName username avatar role")
        .lean(),
      DiscussionComment.countDocuments({
        movieId: movie._id,
        threadId: null,
        parentCommentId: null,
        status: { $ne: "deleted" },
      }),
    ]);

    const rootCommentIds = rootComments.map((c: any) => c._id);

    // Fetch replies for these root comments
    const replies = await DiscussionComment.find({
      movieId: movie._id,
      threadId: null,
      parentCommentId: { $in: rootCommentIds },
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: 1 })
      .populate("userId", "displayName username avatar role")
      .lean();

    // Check user liked comments
    let userLikedCommentIds = new Set<string>();
    if (user && currentUserId) {
      const allCommentIds = [
        ...rootCommentIds,
        ...replies.map((r: any) => r._id),
      ];
      const likes = await CommentLike.find({
        userId: user._id,
        commentId: { $in: allCommentIds },
      })
        .select("commentId")
        .lean();

      likes.forEach((l: any) => {
        userLikedCommentIds.add(l.commentId.toString());
      });
    }

    // Organize replies under root comments (2-tier YouTube style)
    const repliesMap: Record<string, any[]> = {};
    replies.forEach((r: any) => {
      const parentId = r.parentCommentId.toString();
      if (!repliesMap[parentId]) {
        repliesMap[parentId] = [];
      }
      repliesMap[parentId].push({
        ...r,
        isLiked: userLikedCommentIds.has(r._id.toString()),
        isAuthor: currentUserId && r.userId?._id?.toString() === currentUserId,
      });
    });

    const structuredComments = rootComments.map((c: any) => ({
      ...c,
      isLiked: userLikedCommentIds.has(c._id.toString()),
      isAuthor: currentUserId && c.userId?._id?.toString() === currentUserId,
      replies: repliesMap[c._id.toString()] || [],
    }));

    return NextResponse.json({
      success: true,
      comments: structuredComments,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + rootComments.length < total,
      },
    });
  } catch (error: any) {
    console.error("Movie comments GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load comments." },
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
        { success: false, message: "Authentication required to post comments.", requiresAuth: true },
        { status: 401 }
      );
    }

    const isAllowed = checkRateLimit(`comment_${user._id}`, 15, 60000);
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, message: "Posting too fast. Please wait a minute." },
        { status: 429 }
      );
    }

    await connectDB();
    const slug = params.slug;

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

    const body = await req.json();
    const { content, parentCommentId, hasSpoiler = false } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Comment content cannot be empty." },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizeText(content.trim().slice(0, 2000));

    // YouTube style: flatten nested replies to root level if parent already has parent
    let resolvedParentId: any = null;
    if (parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId)) {
      const parent = await DiscussionComment.findById(parentCommentId).lean() as any;
      if (parent) {
        resolvedParentId = parent.parentCommentId || parent._id;
      }
    }

    const newComment = await DiscussionComment.create({
      movieId: movie._id,
      threadId: null,
      userId: user._id,
      parentCommentId: resolvedParentId,
      content: sanitizedContent,
      hasSpoiler: Boolean(hasSpoiler),
      status: "active",
      likeCount: 0,
      replyCount: 0,
    });

    // Increment replyCount on parent if replying
    if (resolvedParentId) {
      await DiscussionComment.findByIdAndUpdate(resolvedParentId, {
        $inc: { replyCount: 1 },
      });
    }

    // Increment user stats
    await CommunityUser.findByIdAndUpdate(user._id, {
      $inc: { commentCount: 1 },
    });

    // Activity log
    await CommunityActivity.create({
      userId: user._id,
      type: "comment_created",
      movieId: movie._id,
      commentId: newComment._id,
      metadata: {
        movieTitle: movie.title,
        snippet: sanitizedContent.slice(0, 80),
      },
    });

    const populated = await DiscussionComment.findById(newComment._id)
      .populate("userId", "displayName username avatar role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Comment posted successfully!",
      comment: {
        ...populated,
        isLiked: false,
        isAuthor: true,
        replies: [],
      },
    });
  } catch (error: any) {
    console.error("Movie comment POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to post comment." },
      { status: 500 }
    );
  }
}
