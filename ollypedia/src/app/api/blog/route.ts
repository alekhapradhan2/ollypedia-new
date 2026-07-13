import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page     = parseInt(searchParams.get("page")     || "1");
    const limit    = parseInt(searchParams.get("limit")    || "12");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const movie    = searchParams.get("movie");
    const hasMovie = searchParams.get("hasMovie");
    const skip     = (page - 1) * limit;

    const filter: any = { published: true };
    if (category) filter.category = category;
    if (featured === "true") filter.featured = true;
    if (movie) filter.movieTitle = { $regex: movie, $options: "i" };
    if (hasMovie === "true") filter.movieTitle = { $exists: true, $ne: "" };

    const [blogs, total] = await Promise.all([
      Blog.find(filter, "-content -reviews")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        blogs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
