import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";

function isOid(s: string) {
  return /^[a-f0-9]{24}$/i.test(s);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const param = params.id;
    let castMember: any = null;

    if (isOid(param)) {
      castMember = await Cast.findById(param).lean();
    } else {
      const nameQuery = param.replace(/-/g, " ").trim();
      castMember = await Cast.findOne({ name: { $regex: new RegExp("^" + nameQuery + "$", "i") } }).lean();
      if (!castMember) {
        castMember = await Cast.findOne({ name: { $regex: nameQuery, $options: "i" } }).lean();
      }
    }

    if (!castMember) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get their movies
    const movies = await Movie.find(
      { "cast.castId": castMember._id },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict"
    ).sort({ releaseDate: -1 }).lean();

    return NextResponse.json({ ...castMember, moviesList: movies });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
