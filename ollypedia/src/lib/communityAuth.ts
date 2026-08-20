import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import CommunityUser, { ICommunityUser } from "@/models/community/CommunityUser";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.COMMUNITY_JWT_SECRET ||
  "ollypedia-community-secret-key-2026-secure-jwt-token";

const COOKIE_NAME = "ollypedia_community_token";
const TOKEN_EXPIRY = "30d";

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
  status: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function extractToken(req: NextRequest): string | null {
  // 1. Check HTTP-only cookie
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value) return cookie.value;

  // 2. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

export async function getAuthenticatedUser(
  req: NextRequest
): Promise<ICommunityUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  await connectDB();
  const user = await CommunityUser.findById(payload.userId);
  if (!user || user.status === "deleted" || user.status === "suspended") {
    return null;
  }

  return user;
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function sanitizeUser(user: ICommunityUser) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio || "",
    role: user.role,
    status: user.status,
    joinedAt: user.joinedAt,
    discussionCount: user.discussionCount || 0,
    commentCount: user.commentCount || 0,
    voteCount: user.voteCount || 0,
    likesReceived: user.likesReceived || 0,
  };
}

export function sanitizePublicUser(user: ICommunityUser) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio || "",
    role: user.role,
    joinedAt: user.joinedAt,
    discussionCount: user.discussionCount || 0,
    commentCount: user.commentCount || 0,
    voteCount: user.voteCount || 0,
    likesReceived: user.likesReceived || 0,
  };
}
