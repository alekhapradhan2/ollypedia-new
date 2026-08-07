import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { syncMovieCastRelations } from "@/lib/castSync";

export const dynamic = 'force-dynamic';

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
        .populate("cast.castId", "name photo type roles bio")
        .lean();
    } else {
      movie = await Movie.findOne({ slug: param })
        .populate("productionId", "name logo")
        .populate("collaborators", "name logo")
        .populate("cast.castId", "name photo type roles bio")
        .lean();
    }

    if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (Array.isArray(movie.cast)) {
      movie.cast = movie.cast.map((item: any) => {
        if (item.castId && typeof item.castId === "object") {
          return {
            ...item,
            name: item.castId.name || item.name,
            photo: item.castId.photo || item.photo,
            castId: item.castId._id || item.castId,
          };
        }
        return item;
      });
    }

    return NextResponse.json(movie);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await req.json();

    const updatedMovie = await Movie.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updatedMovie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });

    if (Array.isArray(body.cast)) {
      await syncMovieCastRelations(id, body.cast);
    }

    return NextResponse.json(updatedMovie);
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

    const deleted = await Movie.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Movie not found" }, { status: 404 });

    return NextResponse.json({ message: "Movie deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
