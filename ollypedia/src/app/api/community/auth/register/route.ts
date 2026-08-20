import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import CommunityActivity from "@/models/community/CommunityActivity";
import {
  hashPassword,
  signToken,
  setAuthCookie,
  sanitizeUser,
} from "@/lib/communityAuth";
import { checkRateLimit, sanitizeText } from "@/lib/communityHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client";
    const rl = checkRateLimit(`reg_${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();
    const body = await req.json();
    let { username, displayName, email, password } = body;

    if (!username || !displayName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "All fields (username, display name, email, password) are required." },
        { status: 400 }
      );
    }

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    displayName = sanitizeText(displayName.trim());

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { success: false, message: "Username must be 3-30 characters with alphanumeric characters and underscores only." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const existingUser = await CommunityUser.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { success: false, message: "This username is already taken. Please pick another." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const defaultAvatars = [
      "https://api.dicebear.com/7.x/bottts/svg?seed=" + username,
      "https://api.dicebear.com/7.x/thumbs/svg?seed=" + username,
      "https://api.dicebear.com/7.x/identicon/svg?seed=" + username,
    ];
    const avatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const newUser = await CommunityUser.create({
      username,
      displayName,
      email,
      passwordHash,
      avatar,
      role: "user",
      status: "active",
      joinedAt: new Date(),
    });

    await CommunityActivity.create({
      userId: newUser._id,
      type: "REGISTER",
      metadata: { snippet: `Joined the Ollypedia Community as @${username}` },
    });

    const token = signToken({
      userId: newUser._id.toString(),
      username: newUser.username,
      role: newUser.role,
      status: newUser.status,
    });

    const sanitized = sanitizeUser(newUser);
    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful! Welcome to Ollypedia Community.",
        user: sanitized,
        token,
      },
      { status: 201 }
    );

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Community register error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to register." },
      { status: 500 }
    );
  }
}
