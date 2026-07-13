import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page        = parseInt(searchParams.get("page")         || "1");
    const limit       = parseInt(searchParams.get("limit")        || "20");
    const singer      = searchParams.get("singer");
    const musicDir    = searchParams.get("musicDirector");
    const movieSlug   = searchParams.get("movie");
    const skip        = (page - 1) * limit;

    // Build match for embedded songs
    const songMatch: any = {};
    if (singer)   songMatch["media.songs.singer"]        = { $regex: singer,   $options: "i" };
    if (musicDir) songMatch["media.songs.musicDirector"] = { $regex: musicDir, $options: "i" };

    const movieMatch: any = {};
    if (movieSlug) movieMatch.slug = movieSlug;

    const basePipeline: any[] = [
      { $match: movieMatch },
      { $unwind: { path: "$media.songs", includeArrayIndex: "songIndex" } },
      ...(Object.keys(songMatch).length ? [{ $match: songMatch }] : []),
    ];

    const projectStage = { $project: {
      _id: 0,
      songId:        "$media.songs._id",
      title:         "$media.songs.title",
      singer:        "$media.songs.singer",
      musicDirector: "$media.songs.musicDirector",
      lyricist:      "$media.songs.lyricist",
      ytId:          "$media.songs.ytId",
      thumbnailUrl:  "$media.songs.thumbnailUrl",
      description:   "$media.songs.description",
      lyrics:        "$media.songs.lyrics",
      movieTitle:    "$title",
      movieSlug:     "$slug",
      movieId:       "$_id",
      songIndex:     "$songIndex",
    }};

    const [songs, countResult] = await Promise.all([
      Movie.aggregate([
        ...basePipeline,
        { $sort: { "media.songs.title": 1 } },
        { $skip: skip },
        { $limit: limit },
        projectStage,
      ]),
      Movie.aggregate([
        ...basePipeline,
        { $count: "total" }
      ])
    ]);

    const total = countResult[0]?.total || 0;

    return NextResponse.json(
      {
        songs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
