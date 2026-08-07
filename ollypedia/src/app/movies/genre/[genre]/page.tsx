import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { MovieCard } from "@/components/movie/MovieCard";
import { buildMeta, SITE_URL } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { Film } from "lucide-react";

export const revalidate = 3600;

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export async function generateMetadata({
  params,
}: {
  params: { genre: string };
}): Promise<Metadata> {
  const genreName = capitalize(params.genre);

  return buildMeta({
    title: `Odia ${genreName} Movies – Ollywood ${genreName} Films List`,
    description: `Explore all Odia ${genreName} movies in Ollywood cinema. Discover top ${genreName} Odia films with full cast, trailer, reviews, and box office updates on Ollypedia.`,
    keywords: [
      `Odia ${genreName} movies`,
      `Ollywood ${genreName} films`,
      `best Odia ${genreName} movies`,
      `top Odia ${genreName} cinema`,
      `${genreName} Odia movie list`,
    ],
    url: `/movies/genre/${params.genre.toLowerCase()}`,
  });
}

export default async function GenreMoviesPage({
  params,
}: {
  params: { genre: string };
}) {
  await connectDB();
  const genreName = capitalize(params.genre);
  const genreRegex = new RegExp(`^${genreName}$`, "i");

  const movies = await Movie.find(
    { genre: { $regex: genreRegex } },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict"
  )
    .sort({ releaseDate: -1 })
    .lean();

  if (!movies || movies.length === 0) {
    // If no exact match, try broader regex before 404
    const broadMovies = await Movie.find(
      { genre: { $regex: new RegExp(params.genre, "i") } },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict"
    )
      .sort({ releaseDate: -1 })
      .lean();

    if (!broadMovies || broadMovies.length === 0) {
      notFound();
    }
  }

  const movieList = JSON.parse(JSON.stringify(movies));
  const canonicalUrl = `${SITE_URL}/movies/genre/${params.genre.toLowerCase()}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Movies", item: `${SITE_URL}/movies` },
        { "@type": "ListItem", position: 3, name: `${genreName} Movies`, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Odia ${genreName} Movies`,
      description: `Complete directory of Odia ${genreName} movies in Ollywood.`,
      itemListElement: movieList.map((m: any, index: number) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Movie",
          name: m.title,
          url: `${SITE_URL}/movie/${m.slug || m._id}`,
        },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      {jsonLd.map((sd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }}
        />
      ))}

      {/* Header */}
      <div className="bg-[#111] border-b border-[#1f1f1f] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Breadcrumb
              crumbs={[
                { label: "Movies", href: "/movies" },
                { label: `${genreName} Movies` },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold font-display">
                Odia <span className="text-orange-400">{genreName}</span> Movies
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Browse {movieList.length} Odia {genreName.toLowerCase()} cinema release{movieList.length !== 1 ? "s" : ""} on Ollypedia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {movieList.map((movie: any) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      </div>
    </main>
  );
}
