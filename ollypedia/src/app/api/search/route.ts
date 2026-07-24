import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";

// ─── Build an advanced fuzzy regex from the query ─────────────────────────────
function fuzzyRegex(q: string) {
  const clean = q.trim().toLowerCase();
  
  // 1. Remove common vowels if the word is long enough, as users often drop them
  // 2. Replace 'c' or 'ck' with 'k', 'ph' with 'f', 'v' with 'b' (common Odia typos)
  let normalized = clean
    .replace(/ck/g, "k")
    .replace(/c/g, "k")
    .replace(/ph/g, "f")
    .replace(/v/g, "b")
    .replace(/w/g, "b");
    
  // Create a regex that allows any characters between the letters, 
  // making it highly resilient to missing/added letters.
  const escaped = normalized
    .split("")
    .filter(c => /[a-z0-9]/.test(c)) // Only keep alphanumeric for fuzzy
    .join(".*");
    
  return { $regex: escaped || clean, $options: "i" };
}

// Exact-prefix / contains regex (fast, used alongside fuzzy on OR)
function exactRegex(q: string) {
  return { $regex: q.trim(), $options: "i" };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json(
        { movies: [], cast: [], blogs: [], songs: [], boxOffice: [] },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    const exact = exactRegex(q);
    const fuzzy = fuzzyRegex(q);

    // Helper: build an OR filter that checks both exact and fuzzy on every field
    function orFilter(...fields: string[]) {
      return {
        $or: fields.flatMap((f) => [{ [f]: exact }, { [f]: fuzzy }]),
      };
    }

    const [movies, cast, blogs, songMovies] = await Promise.all([
      Movie.find(
        orFilter("title", "director", "genre"),
        "title slug posterUrl thumbnailUrl releaseDate genre verdict"
      )
        .limit(6)
        .lean(),

      Cast.find(
        orFilter("name", "type"),
        "name photo type roles slug"
      )
        .limit(5)
        .lean(),

      Blog.find(
        { published: true, ...orFilter("title", "excerpt", "tags") },
        "title slug excerpt coverImage category createdAt"
      )
        .limit(4)
        .lean(),

      Movie.find(
        { "media.songs.title": exact },
        "title slug media.songs posterUrl"
      )
        .limit(5)
        .lean(),
    ]);

    // Flatten matching songs from movie documents
    const songs = (songMovies as any[]).flatMap((m: any) =>
      (m.media?.songs || [])
        .filter((s: any) => new RegExp(q, "i").test(s.title || ""))
        .slice(0, 2)
        .map((s: any, i: number) => ({
          title: s.title,
          singer: s.singer,
          movieTitle: m.title,
          movieSlug: m.slug,
          songIndex: i,
          thumbnailUrl: s.thumbnailUrl || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : m.posterUrl),
        }))
    ).slice(0, 5);

    return NextResponse.json(
      { movies, cast, blogs, songs, query: q },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}