import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { user, rating, text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });
    if (!rating || rating < 1 || rating > 10)
      return NextResponse.json({ error: "Rating must be 1–10" }, { status: 400 });

    const review = {
      user: user || "Anonymous",
      rating: Number(rating),
      text: text.trim(),
      date: new Date().toISOString(),
      likes: 0,
    };

    const movie = await Movie.findByIdAndUpdate(
      params.id,
      { $push: { reviews: review } },
      { new: true }
    ).select("reviews").lean() as any;

    if (!movie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });

    const newReview = movie.reviews[movie.reviews.length - 1];
    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
