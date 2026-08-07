import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";
import { syncCastEmbeddedData, syncCastMoviesArray } from "@/lib/castSync";

export const dynamic = 'force-dynamic';

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
    const rawMovies = await Movie.find(
      {
        $or: [
          { "cast.castId": castMember._id },
          ...(Array.isArray(castMember.movies) && castMember.movies.length > 0 ? [{ _id: { $in: castMember.movies } }] : []),
        ]
      },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict cast"
    ).sort({ releaseDate: -1 }).lean();

    const memberIdStr = String(castMember._id);
    const memberNameLower = (castMember.name || "").toLowerCase().trim();

    const moviesList = rawMovies.filter((movie: any) => {
      if (!Array.isArray(movie.cast) || movie.cast.length === 0) return false;
      return movie.cast.some((c: any) => {
        if (c.castId && String(c.castId) === memberIdStr) return true;
        if (c.name && c.name.toLowerCase().trim() === memberNameLower) return true;
        return false;
      });
    });

    return NextResponse.json({ ...castMember, moviesList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await req.json();

    const updatedCast = await Cast.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updatedCast) return NextResponse.json({ error: "Cast member not found" }, { status: 404 });

    // Sync embedded name and photo in all Movie documents & recalculate Cast.movies
    await syncCastEmbeddedData(id, body.name, body.photo);
    await syncCastMoviesArray(id);

    return NextResponse.json(updatedCast);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;

    const deleted = await Cast.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Cast member not found" }, { status: 404 });

    // Pull from all Movie cast arrays
    await Movie.updateMany(
      { "cast.castId": id },
      { $pull: { cast: { castId: id } } }
    );

    return NextResponse.json({ message: "Cast member deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
