// app/api/trailers/route.ts
// Dedicated API for the Trailers module
// Returns paginated, filterable movies that have at least one video asset
// Query params: page, limit, type, genre, status, month, year, q, sort

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1", 10));
    const limit  = Math.min(40, parseInt(searchParams.get("limit") || "20", 10));
    const type   = searchParams.get("type");   // trailer | teaser | motionPoster | firstLook | any
    const genre  = searchParams.get("genre");
    const status = searchParams.get("status"); // upcoming | released
    const month  = searchParams.get("month");  // e.g. "2026-07"
    const year   = searchParams.get("year");
    const q      = searchParams.get("q");
    const sort   = searchParams.get("sort") || "newest"; // newest | oldest | releaseDate
    const skip   = (page - 1) * limit;

    const filter: any = {};

    // ── Video type filter ──────────────────────────────────────────────────────
    if (type === "trailer") {
      filter["media.videos"] = { $elemMatch: { type: "Trailer", ytId: { $ne: "" } } };
    } else if (type === "teaser") {
      filter["media.videos"] = { $elemMatch: { type: "Teaser", ytId: { $ne: "" } } };
    } else if (type === "motionPoster") {
      filter["media.videos"] = { $elemMatch: { type: "Motion Poster", ytId: { $ne: "" } } };
    } else if (type === "firstLook") {
      filter["media.videos"] = { $elemMatch: { type: { $in: ["First Look", "Glimpse"] }, ytId: { $ne: "" } } };
    } else {
      // default: any video
      filter["media.videos.ytId"] = { $exists: true, $ne: "" };
    }

    // ── Genre filter ──────────────────────────────────────────────────────────
    if (genre) filter.genre = { $in: [genre] };

    // ── Status filter ─────────────────────────────────────────────────────────
    if (status === "upcoming") {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { verdict: "Upcoming" },
          { verdict: { $exists: false } },
          { verdict: null },
          { status: "Upcoming" },
        ],
      });
    } else if (status === "released") {
      filter.verdict = { $nin: ["Upcoming", null, ""] };
    }

    // ── Month filter (e.g. "2026-07") ─────────────────────────────────────────
    if (month) {
      const [y, mo] = month.split("-");
      if (y && mo) {
        const start = new Date(`${y}-${mo}-01`).toISOString().split("T")[0];
        const endDate = new Date(parseInt(y), parseInt(mo), 0); // last day of month
        const end = endDate.toISOString().split("T")[0];
        filter.releaseDate = { $gte: start, $lte: end };
      }
    }

    // ── Year filter ───────────────────────────────────────────────────────────
    if (year && !month) {
      const start = `${year}-01-01`;
      const end   = `${year}-12-31`;
      filter.releaseDate = { $gte: start, $lte: end };
    }

    // ── Text search ───────────────────────────────────────────────────────────
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title:    re },
          { director: re },
          { producer: re },
          { genre:    re },
          { "cast.name": re },
        ],
      });
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    const hasRealDate = (field: string) => ({
      $and: [{ $ifNull: [field, false] }, { $ne: [field, ""] }],
    });

    const todayStr = new Date().toISOString().split("T")[0];

    const pipeline: any[] = [
      { $match: filter },
      { $project: { reviews: 0, story: 0 } },
    ];

    if (sort === "releaseDate") {
      pipeline.push(
        {
          $addFields: {
            _releaseDateObj: {
              $cond: [hasRealDate("$releaseDate"), { $toDate: "$releaseDate" }, null],
            },
          },
        },
        { $sort: { _releaseDateObj: 1, _id: -1 } }
      );
    } else if (sort === "trailerDate") {
      pipeline.push(
        {
          $addFields: {
            _trailerDateObj: {
              $cond: [
                hasRealDate("$media.trailerReleaseDate"),
                { $toDate: "$media.trailerReleaseDate" },
                { $toDate: "$createdAt" },
              ],
            },
          },
        },
        { $sort: { _trailerDateObj: -1 } }
      );
    } else {
      // Default "newest": released movies by releaseDate DESC, TBA/upcoming at end
      pipeline.push(
        {
          $addFields: {
            _isReleased: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$releaseDate", false] },
                    { $ne: ["$releaseDate", ""] },
                    { $lte: ["$releaseDate", todayStr] },
                    { $ne: ["$verdict", "Upcoming"] },
                    { $ne: ["$releaseTBA", true] },
                  ],
                },
                1,
                0,
              ],
            },
            _releaseDateObj: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$releaseDate", false] },
                    { $ne: ["$releaseDate", ""] },
                  ],
                },
                { $toDate: "$releaseDate" },
                null,
              ],
            },
          },
        },
        { $sort: { _isReleased: -1, _releaseDateObj: -1, _id: -1 } }
      );
    }

    pipeline.push({ $skip: skip }, { $limit: limit });

    const [movies, total] = await Promise.all([
      Movie.aggregate(pipeline),
      Movie.countDocuments(filter),
    ]);

    return NextResponse.json({
      movies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("[/api/trailers] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
