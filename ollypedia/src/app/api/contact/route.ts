import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/models/Contact";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, subject, message } = await req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 });

    const contact = await Contact.create({ name, email, subject, message });
    return NextResponse.json({ success: true, id: contact._id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
