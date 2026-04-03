import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";
import { MovieCard } from "@/components/movie/MovieCard";
import { BlogCard } from "@/components/blog/BlogCard";
import { buildMeta } from "@/lib/seo";
import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }): Promise<Metadata> {
  return buildMeta({
    title: searchParams.q ? `Search results for "${searchParams.q}"` : "Search Odia Movies, Actors & More",
    description: "Search Ollypedia's database of Odia movies, actors, directors, songs, and blog articles.",
    url: "/search",
  });
}

async function doSearch(q: string) {
  await connectDB();
  const regex = { $regex: q, $options: "i" };
  const [movies, cast, blogs] = await Promise.all([
    Movie.find(
      { $or: [{ title: regex }, { director: regex }] },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict"
    ).limit(8).lean(),
    Cast.find({ name: regex }, "name photo type roles").limit(8).lean(),
    Blog.find(
      { published: true, $or: [{ title: regex }, { excerpt: regex }] },
      "title slug excerpt coverImage category createdAt readTime author"
    ).limit(4).lean(),
  ]);
  return { movies, cast, blogs };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() || "";
  const results = q ? await doSearch(q) : { movies: [], cast: [], blogs: [] };
  const total = results.movies.length + results.cast.length + results.blogs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-title mb-2">
          {q ? `Results for "${q}"` : "Search Ollypedia"}
        </h1>
        {q && <p className="text-gray-500 text-sm">{total} results found</p>}
      </div>

      {!q && (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Search for Odia movies, actors, and more</p>
          <p className="text-gray-600 text-sm">Use the search bar in the header to get started</p>
        </div>
      )}

      {q && total === 0 && (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No results found for "{q}"</p>
          <p className="text-gray-600 text-sm">Try different keywords or browse our collections</p>
          <div className="flex justify-center gap-3 mt-6">
            <Link href="/movies" className="btn-primary">Browse Movies</Link>
            <Link href="/cast"   className="btn-outline">Browse Cast</Link>
          </div>
        </div>
      )}

      {q && total > 0 && (
        <div className="space-y-10">
          {results.movies.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                Movies <span className="text-gray-500 text-sm font-normal">({results.movies.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {(results.movies as any[]).map((m) => (
                  <MovieCard key={String(m._id)} movie={m} />
                ))}
              </div>
            </section>
          )}

          {results.cast.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                Cast & Crew <span className="text-gray-500 text-sm font-normal">({results.cast.length})</span>
              </h2>
              <div className="flex flex-wrap gap-4">
                {(results.cast as any[]).map((c) => (
                  <Link key={String(c._id)} href={`/cast/${c._id}`} className="group flex items-center gap-3 card px-4 py-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#2a2a2a]">
                      <Image src={c.photo || "/placeholder-person.jpg"} alt={c.name} fill className="object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.roles?.length ? c.roles.join(", ") : c.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.blogs.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                Blog <span className="text-gray-500 text-sm font-normal">({results.blogs.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(results.blogs as any[]).map((b) => (
                  <BlogCard key={String(b._id)} blog={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
