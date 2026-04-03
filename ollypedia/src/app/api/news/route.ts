import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import News from "@/models/News";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get("page")  || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip  = (page - 1) * limit;

    const [news, total] = await Promise.all([
      News.find({ published: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      News.countDocuments({ published: true }),
    ]);

    return NextResponse.json({
      news,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
