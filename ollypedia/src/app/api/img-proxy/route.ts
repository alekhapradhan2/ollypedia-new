// app/api/img-proxy/route.ts
// Proxies external images through your own domain so canvas drawImage()
// never hits a CORS taint — required for toBlob() to work on the share card.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow http/https URLs (no file://, data:, etc.)
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Ollypedia/1.0" },
    });
    if (!upstream.ok) return new NextResponse("Upstream error", { status: 502 });

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow the browser to use this in a canvas without taint
        "Access-Control-Allow-Origin": "*",
        // Cache for 7 days — poster images never change
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}