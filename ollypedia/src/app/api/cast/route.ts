import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get("page")  || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const type  = searchParams.get("type");
    const skip  = (page - 1) * limit;

    const filter: any = {};
    if (type) filter.$or = [{ type }, { roles: type }];

    const [cast, total] = await Promise.all([
      Cast.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Cast.countDocuments(filter),
    ]);

    return NextResponse.json({
      cast,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
