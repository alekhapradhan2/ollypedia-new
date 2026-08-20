import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import CommentLike from "@/models/community/CommentLike";
import CommunityUser from "@/models/community/CommunityUser";
import CommunityActivity from "@/models/community/CommunityActivity";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { checkRateLimit, sanitizeText } from "@/lib/communityHelpers";
import "@/models/Movie";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const idOrSlug = params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const thread = await DiscussionThread.findOne(query).select("_id");
    if (!thread) {
      return NextResponse.json(
        { success: false, message: "Thread not found." },
        { status: 404 }
      );
    }

    const threadId = thread._id;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sort = searchParams.get("sort") || "top"; // top | newest | oldest
    const skip = (page - 1) * limit;

    let sortOption: any = { likeCount: -1, createdAt: -1 };
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // 1. Fetch top-level comments (parentCommentId: null)
    const [rootComments, totalRoots] = await Promise.all([
      DiscussionComment.find({
        threadId,
        parentCommentId: null,
        status: { $in: ["active", "deleted", "reported"] },
      })
        .populate("userId", "username displayName avatar role status")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      DiscussionComment.countDocuments({
        threadId,
        parentCommentId: null,
        status: { $in: ["active", "deleted", "reported"] },
      }),
    ]);

    // 2. Fetch replies for these root comments
    const rootIds = rootComments.map((c: any) => c._id);
    const replies = await DiscussionComment.find({
      threadId,
      parentCommentId: { $in: rootIds },
      status: { $in: ["active", "deleted", "reported"] },
    })
      .populate("userId", "username displayName avatar role status")
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by parentCommentId
    const repliesByParent: Record<string, any[]> = {};
    replies.forEach((r: any) => {
      const pid = r.parentCommentId.toString();
      if (!repliesByParent[pid]) repliesByParent[pid] = [];
      repliesByParent[pid].push(r);
    });

    // Check user likes
    const currentUser = await getAuthenticatedUser(req);
    let likedCommentIds = new Set<string>();

    if (currentUser) {
      const allCommentIds = [
        ...rootIds,
        ...replies.map((r: any) => r._id),
      ];
      if (allCommentIds.length > 0) {
        const userLikes = await CommentLike.find({
          userId: currentUser._id,
          commentId: { $in: allCommentIds },
        }).lean();
        likedCommentIds = new Set(
          userLikes.map((l: any) => l.commentId.toString())
        );
      }
    }

    const formatComment = (c: any) => ({
      ...c,
      content:
        c.status === "deleted"
          ? "[Comment deleted by author]"
          : c.content,
      isLiked: likedCommentIds.has(c._id.toString()),
      isAuthor: currentUser
        ? c.userId?._id?.toString() === currentUser._id.toString()
        : false,
    });

    const structuredComments = rootComments.map((c: any) => {
      const parentReplies = repliesByParent[c._id.toString()] || [];
      return {
        ...formatComment(c),
        replies: parentReplies.map(formatComment),
      };
    });

    return NextResponse.json({
      success: true,
      comments: structuredComments,
      pagination: {
        page,
        limit,
        total: totalRoots,
        pages: Math.ceil(totalRoots / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch comments error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load comments." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          message: "Login required to post a comment or reply.",
        },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`comment_${user._id}`, 20, 60 * 1000); // 20 per minute
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "You are posting comments too fast. Please slow down." },
        { status: 429 }
      );
    }

    await connectDB();
    const idOrSlug = params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const thread = await DiscussionThread.findOne(query).populate(
      "movieId",
      "title slug"
    );
    if (!thread || thread.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Discussion thread not found or closed." },
        { status: 404 }
      );
    }

    const body = await req.json();
    let { content, parentCommentId, hasSpoiler } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Comment text cannot be empty." },
        { status: 400 }
      );
    }

    content = sanitizeText(content.trim());
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Comment must not exceed 2000 characters." },
        { status: 400 }
      );
    }

    let validParentId: any = null;
    if (parentCommentId) {
      const parent = await DiscussionComment.findOne({
        _id: parentCommentId,
        threadId: thread._id,
      });
      if (parent) {
        // Enforce 2-level depth (reply to reply becomes sibling reply attached to root)
        validParentId = parent.parentCommentId || parent._id;
        await DiscussionComment.findByIdAndUpdate(validParentId, {
          $inc: { replyCount: 1 },
        });
      }
    }

    const newComment = await DiscussionComment.create({
      movieId: thread.movieId._id,
      threadId: thread._id,
      userId: user._id,
      parentCommentId: validParentId,
      content,
      hasSpoiler: Boolean(hasSpoiler),
      status: "active",
    });

    // Update thread comment count and last activity
    thread.commentCount += 1;
    thread.lastActivityAt = new Date();
    await thread.save();

    // Increment user comment count
    await CommunityUser.findByIdAndUpdate(user._id, {
      $inc: { commentCount: 1 },
    });

    // Record activity
    await CommunityActivity.create({
      userId: user._id,
      movieId: thread.movieId._id,
      type: validParentId ? "CREATE_REPLY" : "CREATE_COMMENT",
      referenceId: newComment._id,
      metadata: {
        movieTitle: (thread.movieId as any).title,
        movieSlug: (thread.movieId as any).slug,
        threadTitle: thread.title,
        threadSlug: thread.slug,
        snippet: content.slice(0, 100),
      },
    });

    const populated = await DiscussionComment.findById(newComment._id)
      .populate("userId", "username displayName avatar role status")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: validParentId ? "Reply posted!" : "Comment posted!",
        comment: {
          ...populated,
          isLiked: false,
          isAuthor: true,
          replies: [],
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to post comment." },
      { status: 500 }
    );
  }
}
