import { NextRequest, NextResponse } from "next/server";
import { syncAllCastAndMovies } from "@/lib/castSync";

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const result = await syncAllCastAndMovies();
    return NextResponse.json({
      message: "Cast and Movie sync completed successfully",
      stats: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
