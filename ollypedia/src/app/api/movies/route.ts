import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { mongoDateExpr } from "@/lib/dateUtils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page    = parseInt(searchParams.get("page")  || "1");
    const limit   = parseInt(searchParams.get("limit") || "20");
    const genre   = searchParams.get("genre");
    const verdict = searchParams.get("verdict");
    const q       = searchParams.get("q");
    const sort    = searchParams.get("sort") || "-createdAt";
    const skip    = (page - 1) * limit;

    const filter: any = {};
    if (genre)   filter.genre   = { $in: [genre] };
    if (verdict) filter.verdict = verdict;
    if (q)       filter.title   = { $regex: q, $options: "i" };

    const sortMap: Record<string, any> = {
      oldest: { releaseDate:  1 },
      az:     { title:        1 },
      za:     { title:       -1 },
      rating: { imdbRating:  -1 },
    };

    const hasRealDate = (field: string) => ({
      $and: [{ $ifNull: [field, false] }, { $ne: [field, ""] }]
    });

    let movies, total;

    if (verdict === "Upcoming" && (!sort || sort === "latest" || sort === "-createdAt")) {
      [movies, total] = await Promise.all([
        Movie.aggregate([
          { $match: filter },
          { $project: { reviews: 0 } },
          {
            $addFields: {
              _hasDated: { $cond: [hasRealDate("$releaseDate"), 1, 0] },
              _releaseDateObj: mongoDateExpr("$releaseDate", "9999-12-31"),
            },
          },
          { $sort: { _hasDated: -1, _releaseDateObj: 1 } },
          { $skip: skip },
          { $limit: limit },
        ]),
        Movie.countDocuments(filter),
      ]);
    } else if (!sort || sort === "latest" || sort === "-createdAt") {
      [movies, total] = await Promise.all([
        Movie.aggregate([
          { $match: filter },
          { $project: { reviews: 0 } },
          {
            $addFields: {
              _releaseDateObj: mongoDateExpr("$releaseDate", "1900-01-01"),
            },
          },
          { $sort: { _releaseDateObj: -1, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
        ]),
        Movie.countDocuments(filter),
      ]);
    } else {
      const sortBy = sortMap[sort] || sortMap.az;
      [movies, total] = await Promise.all([
        Movie.find(filter, "-reviews")
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .lean(),
        Movie.countDocuments(filter),
      ]);
    }

    return NextResponse.json(
      {
        movies,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
