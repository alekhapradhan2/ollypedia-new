import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectDB();
    const blog = await Blog.findOne({ slug: params.slug, published: true }).lean();
    if (!blog) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Increment views
    await Blog.findByIdAndUpdate((blog as any)._id, { $inc: { views: 1 } });

    return NextResponse.json(blog);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
