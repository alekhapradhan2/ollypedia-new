import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ movies: [], cast: [], blogs: [] });

    const regex = { $regex: q, $options: "i" };

    const [movies, cast, blogs] = await Promise.all([
      Movie.find(
        { $or: [{ title: regex }, { director: regex }, { genre: regex }] },
        "title slug posterUrl thumbnailUrl releaseDate genre verdict"
      ).limit(8).lean(),
      Cast.find(
        { $or: [{ name: regex }, { type: regex }] },
        "name photo type roles"
      ).limit(6).lean(),
      Blog.find(
        { published: true, $or: [{ title: regex }, { excerpt: regex }, { tags: regex }] },
        "title slug excerpt coverImage category createdAt"
      ).limit(4).lean(),
    ]);

    return NextResponse.json({ movies, cast, blogs, query: q });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
