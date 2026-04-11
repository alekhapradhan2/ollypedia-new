import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { MovieCard } from "@/components/movie/MovieCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoviesFilter } from "./MoviesFilter";
import { buildMeta } from "@/lib/seo";

export const revalidate = 3600; // ISR: re-fetch every 1 hour

export const metadata: Metadata = buildMeta({
  title: "Odia Movies – Complete Ollywood Film Database",
  description:
    "Browse the complete list of Odia (Ollywood) movies. Filter by genre, year, verdict and more. Find your favourite Odia films with cast, songs, box office and reviews.",
  keywords: ["Odia movies list", "Ollywood films", "Odia movies 2024", "Odia movies 2025", "Odia cinema database"],
  url: "/movies",
});

const GENRES = ["Action", "Romance", "Drama", "Comedy", "Thriller", "Horror", "Devotional", "Family", "Historical"];
const VERDICTS = ["Hit", "Superhit", "Blockbuster", "Average", "Flop", "Upcoming"];

async function getMovies({
  genre, verdict, sort, page,
}: {
  genre?: string; verdict?: string; sort?: string; page?: number;
}) {
  await connectDB();
  const LIMIT = 20;
  const skip  = ((page || 1) - 1) * LIMIT;
  const filter: any = {};
  if (genre)   filter.genre   = { $in: [genre] };
  if (verdict) filter.verdict = verdict;

  const sortMap: Record<string, any> = {
    latest:     { releaseDate: -1 },
    oldest:     { releaseDate: 1  },
    az:         { title: 1 },
    za:         { title: -1 },
    rating:     { imdbRating: -1 },
  };
  const sortBy = sortMap[sort || "latest"] || sortMap.latest;

  const [movies, total] = await Promise.all([
    Movie.find(filter, "-reviews").sort(sortBy).skip(skip).limit(LIMIT).lean(),
    Movie.countDocuments(filter),
  ]);

  return { movies, total, pages: Math.ceil(total / LIMIT) };
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { genre?: string; verdict?: string; sort?: string; page?: string };
}) {
  const { genre, verdict, sort, page } = searchParams;
  const { movies, total, pages } = await getMovies({
    genre, verdict, sort, page: Number(page) || 1,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="Odia Movies"
        subtitle={`${total} films in our database`}
      />

      {/* Filter bar — client component */}
      <MoviesFilter
        genres={GENRES}
        verdicts={VERDICTS}
        active={{ genre, verdict, sort, page: Number(page) || 1 }}
        totalPages={pages}
      />

      {/* SEO intro */}
      <div className="mb-8 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <p className="text-gray-400 text-sm leading-relaxed">
          Welcome to Ollypedia's comprehensive Odia movie database — the most complete listing of Odia films
          (Ollywood movies) on the internet. Browse through hundreds of Odia films spanning multiple decades,
          from classic Odia movies to the latest Ollywood blockbusters. Each movie page includes full cast
          details, songs, box office collection, synopsis, reviews, and trailer. Use the filters above to find
          movies by genre, verdict, or release year.
        </p>
      </div>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((m: any) => (
            <MovieCard key={String(m._id)} movie={m} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">No movies found for this filter.</div>
      )}
    </div>
  );
}
