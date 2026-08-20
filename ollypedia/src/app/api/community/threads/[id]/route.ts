import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionThread from "@/models/community/DiscussionThread";
import ThreadLike from "@/models/community/ThreadLike";
import { getAuthenticatedUser } from "@/lib/communityAuth";
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

    const thread = await DiscussionThread.findOne(query)
      .populate("userId", "username displayName avatar role status joinedAt")
      .populate("movieId", "title slug posterUrl thumbnailUrl releaseDate genre language verdict")
      .lean() as any;

    if (!thread || thread.status === "deleted" || thread.status === "hidden") {
      return NextResponse.json(
        { success: false, message: "Discussion thread not found." },
        { status: 404 }
      );
    }

    // Increment view count asynchronously
    DiscussionThread.findByIdAndUpdate(thread._id, {
      $inc: { viewCount: 1 },
    }).catch(() => {});

    // Check if liked by current user
    const currentUser = await getAuthenticatedUser(req);
    let isLiked = false;
    if (currentUser) {
      const existingLike = await ThreadLike.findOne({
        userId: currentUser._id,
        threadId: thread._id,
      }).lean();
      isLiked = Boolean(existingLike);
    }

    return NextResponse.json({
      success: true,
      thread: {
        ...thread,
        isLiked,
      },
    });
  } catch (error: any) {
    console.error("Fetch thread detail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load thread." },
      { status: 500 }
    );
  }
}
