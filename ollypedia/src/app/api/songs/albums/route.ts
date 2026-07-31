import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { mongoDateExpr } from "@/lib/dateUtils";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const skip = (page - 1) * limit;
    const q = searchParams.get("q") || "";

    const matchFilter: any = { "media.songs.0": { $exists: true } };

    if (q) {
      matchFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { "cast.name": { $regex: q, $options: "i" } },
        { director: { $regex: q, $options: "i" } },
        { "media.songs.singer": { $regex: q, $options: "i" } },
        { "media.songs.musicDirector": { $regex: q, $options: "i" } },
      ];
    }

    const sortDateFallback = mongoDateExpr("$releaseDate", "1900-01-01");

    const movies = await Movie.aggregate([
      { $match: matchFilter },
      { $project: { title: 1, slug: 1, posterUrl: 1, releaseDate: 1, genre: 1, imdbRating: 1, reviews: 1, media: 1 } },
      { $addFields: { _sortDate: sortDateFallback } },
      { $sort: { _sortDate: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Albums API Error:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}
