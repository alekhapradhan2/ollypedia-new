import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

function isOid(s: string) {
  return /^[a-f0-9]{24}$/i.test(s);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const param = params.id;
    let movie: any = null;

    if (isOid(param)) {
      movie = await Movie.findById(param)
        .populate("productionId", "name logo")
        .populate("collaborators", "name logo")
        .lean();
    } else {
      movie = await Movie.findOne({ slug: param })
        .populate("productionId", "name logo")
        .populate("collaborators", "name logo")
        .lean();
    }

    if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(movie);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
