import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { type } = await req.json();
    if (type !== "yes" && type !== "no")
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const update = type === "yes"
      ? { $inc: { interestedYes: 1 } }
      : { $inc: { interestedNo: 1 } };

    const movie = await Movie.findByIdAndUpdate(params.id, update, { new: true })
      .select("interestedYes interestedNo").lean() as any;

    if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ yes: movie.interestedYes, no: movie.interestedNo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
