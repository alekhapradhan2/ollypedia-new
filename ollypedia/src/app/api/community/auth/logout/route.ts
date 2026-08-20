import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/communityAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully." },
    { status: 200 }
  );
  clearAuthCookie(response);
  return response;
}
