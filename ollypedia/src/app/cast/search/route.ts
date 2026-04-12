// app/api/cast/search/route.ts
// GET /api/cast/search?q=<query>  →  PlainPerson[]

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q.length < 1) {
      return NextResponse.json([]);
    }

    await connectDB();

    // Escape regex special chars, then do case-insensitive partial match
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = new RegExp(escaped, "i");

    const docs = await Cast.find(
      { name: regex },
      "name photo type movies"
    )
      .sort({ name: 1 })
      .limit(10)
      .lean();

    const payload = docs.map((d: any) => ({
      _id:       String(d._id),
      name:      d.name  ?? "",
      photo:     d.photo ?? null,
      type:      d.type  ?? null,
      filmCount: Array.isArray(d.movies) ? d.movies.length : 0,
    }));

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[cast/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}