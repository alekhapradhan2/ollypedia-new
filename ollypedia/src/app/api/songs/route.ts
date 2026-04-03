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

    const pipeline: any[] = [
      { $match: movieMatch },
      { $unwind: "$media.songs" },
      ...(Object.keys(songMatch).length ? [{ $match: songMatch }] : []),
      { $project: {
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
      }},
      { $sort: { movieTitle: 1, title: 1 } },
    ];

    const allSongs = await Movie.aggregate(pipeline);
    const total    = allSongs.length;
    const songs    = allSongs.slice(skip, skip + limit);

    return NextResponse.json({
      songs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
