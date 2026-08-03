// lib/movieSeo.ts
// Comprehensive SEO module for Movie pages
// Generates schema.org/Movie entity graph, box office stats, cast relationships, & breadcrumbs

import { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "./seo";
import { formatReleaseDate } from "./dateUtils";

export interface MovieSeoDoc {
  _id: string;
  title: string;
  slug?: string;
  posterUrl?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  synopsis?: string;
  story?: string;
  releaseDate?: string;
  releaseDatePrecision?: string;
  reReleaseDate?: string;
  reReleaseDatePrecision?: string;
  releaseTBA?: boolean;
  isReRelease?: boolean;
  runtime?: string;
  language?: string;
  genre?: string[];
  verdict?: string;
  director?: string;
  producer?: string;
  budget?: string;
  imdbRating?: string;
  reviews?: { rating?: number }[];
  cast?: {
    name: string;
    role?: string;
    type?: string;
    castId?: string;
  }[];
  media?: {
    songs?: { title?: string; singer?: string }[];
    videos?: { title?: string; ytId?: string; type?: string }[];
  };
  boxOffice?: {
    total?: string;
    netCollection?: number;
    grossCollection?: number;
  };
}

/**
 * Builds rich metadata for movie details page
 */
export function buildMovieMeta(movie: MovieSeoDoc): Metadata {
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "";
  const yearLabel = year ? ` (${year})` : "";
  const title = `${movie.title}${yearLabel} Odia Movie – Cast, Story, Songs, Box Office & Review | ${SITE_NAME}`;
  const genres = (movie.genre || []).join(", ") || "Odia";
  const desc = `${movie.title} (${year || "Odia Movie"}) – Full cast & crew, director ${movie.director || ""}, ${genres} movie story, release date, box office collection, hit or flop verdict, songs, and reviews on Ollypedia.`;

  return buildMeta({
    title,
    description: desc,
    keywords: [
      `${movie.title} Odia movie`,
      `${movie.title} release date`,
      `${movie.title} cast`,
      `${movie.title} director`,
      `${movie.title} songs`,
      `${movie.title} box office collection`,
      `${movie.title} review`,
      `${movie.title} hit or flop`,
      `Odia movie ${movie.title}`,
      `Ollywood film ${movie.title}`,
    ],
    url: `/movie/${movie.slug || movie._id}`,
    image: movie.bannerUrl || movie.posterUrl || movie.thumbnailUrl,
    type: "video.movie",
  });
}

/**
 * Generates schema.org/Movie rich entity graph with cast, director, rating, and box office
 */
export function generateMovieJsonLd(movie: MovieSeoDoc) {
  const url = `${SITE_URL}/movie/${movie.slug || movie._id}`;
  const formattedDate = formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short");

  // Calculate average user rating if available
  const avgRating = movie.reviews?.length
    ? (movie.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / movie.reviews.length).toFixed(1)
    : movie.imdbRating || null;

  // Directors & Actors
  const directorObj = movie.director
    ? { "@type": "Person", name: movie.director, url: `${SITE_URL}/cast/${encodeURIComponent(movie.director)}` }
    : undefined;

  const actorList = (movie.cast || []).slice(0, 10).map((c) => ({
    "@type": "Person",
    name: c.name,
    jobTitle: c.role || c.type || "Actor",
    ...(c.castId ? { url: `${SITE_URL}/cast/${c.castId}` } : {}),
  }));

  const movieEntity: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.synopsis || movie.story || `${movie.title} is an Odia feature film.`,
    url: url,
    image: movie.posterUrl || movie.thumbnailUrl,
    datePublished: movie.releaseDate || undefined,
    inLanguage: movie.language || "Odia",
    genre: movie.genre || ["Odia Movie"],
    duration: movie.runtime || undefined,
    ...(directorObj && { director: directorObj }),
    ...(actorList.length > 0 && { actor: actorList }),
  };

  if (avgRating) {
    movieEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      bestRating: "10",
      worstRating: "1",
      ratingCount: movie.reviews?.length || 10,
    };
  }


  // NOTE: boxOffice is NOT a standard schema.org/Movie property.
  // Box office data is expressed via the Article schema on the /box-office/[slug] page instead.
  // Removed invalid MonetaryAmount mapping to avoid structured data validation errors.

  // Breadcrumb
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Movies", item: `${SITE_URL}/movies` },
      { "@type": "ListItem", position: 3, name: movie.title, item: url },
    ],
  };

  return [movieEntity, breadcrumb];
}
