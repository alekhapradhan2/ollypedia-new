import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DiscussionThread from "@/models/community/DiscussionThread";
import ThreadLike from "@/models/community/ThreadLike";
import CommunityUser from "@/models/community/CommunityUser";
import { getAuthenticatedUser } from "@/lib/communityAuth";
import { checkRateLimit } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

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
          message: "Login required to like a discussion.",
        },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`like_thread_${user._id}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many like requests." },
        { status: 429 }
      );
    }

    await connectDB();
    const idOrSlug = params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const thread = await DiscussionThread.findOne(query);
    if (!thread || thread.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Thread not found or unavailable." },
        { status: 404 }
      );
    }

    const existingLike = await ThreadLike.findOne({
      userId: user._id,
      threadId: thread._id,
    });

    let isLiked = false;
    if (existingLike) {
      await ThreadLike.deleteOne({ _id: existingLike._id });
      thread.likeCount = Math.max(0, thread.likeCount - 1);
      await thread.save();

      // Decrement author's likes received
      await CommunityUser.findByIdAndUpdate(thread.userId, {
        $inc: { likesReceived: -1 },
      });
      isLiked = false;
    } else {
      await ThreadLike.create({
        userId: user._id,
        threadId: thread._id,
      });
      thread.likeCount += 1;
      await thread.save();

      // Increment author's likes received
      await CommunityUser.findByIdAndUpdate(thread.userId, {
        $inc: { likesReceived: 1 },
      });
      isLiked = true;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount: thread.likeCount,
    });
  } catch (error: any) {
    console.error("Toggle thread like error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update like." },
      { status: 500 }
    );
  }
}
