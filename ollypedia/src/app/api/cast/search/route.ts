// app/api/cast/search/route.ts
// Place this file at: app/api/cast/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 1) {
      return NextResponse.json([]);
    }

    await connectDB();

    const results = await Cast.find(
      { name: { $regex: q, $options: "i" } },
      "name photo type movies"
    )
      .limit(10)
      .lean();

    const serialised = results.map((d: any) => ({
      _id:       String(d._id),
      name:      d.name  ?? "",
      photo:     d.photo ?? null,
      type:      d.type  ?? null,
      filmCount: Array.isArray(d.movies) ? d.movies.length : 0,
    }));

    return NextResponse.json(serialised, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[cast/search] error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}