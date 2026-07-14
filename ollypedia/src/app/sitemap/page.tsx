import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta } from "@/lib/seo";

export const metadata: Metadata = buildMeta({
  title: "HTML Sitemap – Ollypedia Directory",
  description: "Navigate through the complete Ollypedia directory. Find Odia movies by year, genre, cast members, songs, and box office hits.",
  url: "/sitemap",
});

export default function HTMLSitemap() {
  const years = Array.from({ length: new Date().getFullYear() - 1935 }, (_, i) => new Date().getFullYear() - i);
  const categories = ["action", "romance", "drama", "comedy", "thriller", "horror", "devotional", "family", "historical"];

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        <header>
          <h1 className="text-4xl font-black text-white mb-4">Ollypedia Sitemap</h1>
          <p className="text-gray-400">Complete directory of Odia cinema, movies, songs, and cast profiles.</p>
        </header>

        <section>
          <h2 className="text-2xl font-bold text-orange-400 mb-6 border-b border-white/10 pb-2">Core Sections</h2>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <li><Link href="/" className="text-blue-400 hover:underline">Home</Link></li>
            <li><Link href="/movies" className="text-blue-400 hover:underline">Odia Movies</Link></li>
            <li><Link href="/songs" className="text-blue-400 hover:underline">Odia Songs</Link></li>
            <li><Link href="/cast" className="text-blue-400 hover:underline">Cast & Crew</Link></li>
            <li><Link href="/box-office" className="text-blue-400 hover:underline">Box Office</Link></li>
            <li><Link href="/blog" className="text-blue-400 hover:underline">Blog & News</Link></li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-400 mb-6 border-b border-white/10 pb-2">Movies by Genre</h2>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <li key={cat}>
                <Link href={`/movies/${cat}`} className="text-blue-400 hover:underline capitalize">
                  {cat} Movies
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-400 mb-6 border-b border-white/10 pb-2">Movies by Year (1936 - Present)</h2>
          <ul className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {years.map((year) => (
              <li key={year}>
                <Link href={`/movies/year/${year}`} className="text-blue-400 hover:underline">
                  {year}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
