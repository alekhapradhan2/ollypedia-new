// app/api/movies/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache"; // FIX: import for on-demand ISR
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import Movie from "@/models/Movie";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { user, email, rating, text } = await req.json();

    if (!user?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email?.trim() || !/\S+@\S+\.\S+/.test(email))
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if (!text?.trim())
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    if (!rating || rating < 1 || rating > 10)
      return NextResponse.json(
        { error: "Rating must be 1–10" },
        { status: 400 }
      );

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already submitted a review for this movie (by ObjectId or slug)
    let existingMovie: any = null;
    if (mongoose.Types.ObjectId.isValid(params.id)) {
      existingMovie = await Movie.findById(params.id).select("_id slug reviews").lean();
    }
    if (!existingMovie) {
      existingMovie = await Movie.findOne({ slug: params.id }).select("_id slug reviews").lean();
    }

    if (!existingMovie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Direct MongoDB atomic query check for duplicate email in reviews array
    const duplicateExists = await Movie.exists({
      _id: existingMovie._id,
      "reviews.email": normalizedEmail,
    });

    // Also check in-memory JS array as fallback
    const memoryDuplicate = existingMovie.reviews?.some(
      (r: any) => r.email && r.email.trim().toLowerCase() === normalizedEmail
    );

    if (duplicateExists || memoryDuplicate) {
      return NextResponse.json(
        { error: "A review with this email address has already been submitted for this movie." },
        { status: 400 }
      );
    }

    const review = {
      user: user.trim(),
      email: normalizedEmail,
      rating: Number(rating),
      text: text.trim(),
      date: new Date().toISOString(),
      likes: 0,
    };

    const movie = (await Movie.findByIdAndUpdate(
      existingMovie._id,
      { $push: { reviews: review } },
      { new: true }
    )
      .select("reviews slug")
      .lean()) as any;

    const newReview = movie.reviews[movie.reviews.length - 1];

    // ── FIX: on-demand ISR revalidation ──────────────────────────────────────
    // Tells Next.js to immediately regenerate the movie page in production
    // instead of waiting for the 1-hour revalidate window.
    // Uses slug if available, falls back to _id.
    const pageSlug = movie.slug || String(movie._id);
    revalidatePath(`/movie/${pageSlug}`);
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}