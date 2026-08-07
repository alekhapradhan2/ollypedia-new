// app/api/blog/[slug]/view/route.ts
// Increments the view count for a blog post.
// Called by BlogDetailClient after 2s dwell time (real reads only).
//
// Why a separate Next.js route instead of the Express API:
//  - Works even if the external backend is down or cold-starting
//  - No CORS issues — same origin as the frontend
//  - Directly writes to MongoDB via Mongoose — no round-trip
//
// FIX (Next.js 15): params is now a Promise in App Router route handlers.
// Accessing { slug } synchronously returned undefined, causing every
// POST to return 400 "Missing slug" — which caused the view count to
// never increment (stuck at 0 forever).

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { slug } = resolvedParams;
    if (!slug?.trim()) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    await connectDB();

    const result = await Blog.findOneAndUpdate(
      { slug, published: true },
      { $inc: { views: 1 } },
      { new: true, select: "views" }
    );

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ views: result.views }, { status: 200 });

  } catch (err: any) {
    console.error("View count error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}