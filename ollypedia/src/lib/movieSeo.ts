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
  boxOfficeDays?: { day?: number; net?: string; gross?: string }[];
  reReleaseBoxOfficeDays?: any[];
}

/**
 * Builds rich metadata for movie details page.
 *
 * Dynamically tailors the <title> tag, meta description, and keywords based on:
 *   1. Upcoming / TBA movies: Focuses on "Release Date, Cast, Trailer & Story"
 *   2. Released movies with tracked Box Office: Focuses on "Cast, Story, Songs, Box Office & Review"
 *   3. Catalog / Released movies without Box Office: Focuses on "Cast, Story & Songs"
 */
export function buildMovieMeta(movie: MovieSeoDoc): Metadata {
  const isUpcoming =
    movie.verdict === "Upcoming" ||
    movie.releaseTBA === true ||
    (Boolean(movie.releaseDate) && new Date(movie.releaseDate!) > new Date());

  const hasBoxOffice =
    (Array.isArray(movie.boxOfficeDays) && movie.boxOfficeDays.length > 0) ||
    (Array.isArray(movie.reReleaseBoxOfficeDays) && movie.reReleaseBoxOfficeDays.length > 0) ||
    Boolean(
      movie.boxOffice?.total &&
      movie.boxOffice.total !== "TBA" &&
      movie.boxOffice.total !== "Upcoming"
    );

  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "";
  const yearLabel = year ? ` (${year})` : "";
  const genres = (movie.genre || []).join(", ") || "Odia";

  const directorSegment = movie.director?.trim()
    ? `, directed by ${movie.director.trim()}`
    : "";

  let titleSuffix = "Cast, Story & Songs";
  let desc = "";
  let keywords: string[] = [];

  if (isUpcoming) {
    titleSuffix = "Release Date, Cast, Trailer & Story";
    desc = `${movie.title} (${year || "Upcoming Odia Movie"}) – ${genres} Odia film${directorSegment}. Check scheduled release date, star cast, teaser trailer, story, and latest updates on Ollypedia.`;
    keywords = [
      `${movie.title} Odia movie`,
      `${movie.title} release date`,
      `${movie.title} cast`,
      `${movie.title} trailer`,
      `${movie.title} teaser`,
      `${movie.title} director`,
      `upcoming Odia movie ${movie.title}`,
      `new Odia film ${movie.title}`,
    ];
  } else if (hasBoxOffice) {
    titleSuffix = "Cast, Story, Songs, Box Office & Review";
    desc = `${movie.title} (${year || "Odia Movie"}) – ${genres} Odia film${directorSegment}. Full cast & crew, release date, box office collection, hit or flop verdict, songs, and reviews on Ollypedia.`;
    keywords = [
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
    ];
  } else {
    titleSuffix = "Cast, Story & Songs";
    desc = `${movie.title} (${year || "Odia Movie"}) – ${genres} Odia film${directorSegment}. Full cast & crew, release date, storyline, songs, and details on Ollypedia.`;
    keywords = [
      `${movie.title} Odia movie`,
      `${movie.title} release date`,
      `${movie.title} cast`,
      `${movie.title} director`,
      `${movie.title} songs`,
      `${movie.title} story`,
      `Odia movie ${movie.title}`,
      `Ollywood film ${movie.title}`,
    ];
  }

  const title = `${movie.title}${yearLabel} Odia Movie – ${titleSuffix}`;

  return buildMeta({
    title,
    description: desc,
    keywords,
    url: `/movie/${movie.slug || movie._id}`,
    image: movie.bannerUrl || movie.posterUrl || movie.thumbnailUrl,
    type: "video.movie",
  });
}

/**
 * Generates schema.org/Movie rich entity graph with cast, director, rating, and box office.
 *
 * FIX (SEO): AggregateRating is now suppressed for:
 *   - Movies with verdict "Upcoming" (not yet released) — a perfect 10/10
 *     from "interested" votes on an unreleased film is a spam signal.
 *   - Movies with fewer than 3 user reviews — too few data points to be a
 *     meaningful aggregate, and Google may flag it as inflated.
 */
export function generateMovieJsonLd(movie: MovieSeoDoc) {
  const url = `${SITE_URL}/movie/${movie.slug || movie._id}`;
  const formattedDate = formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short");

  // Calculate average user rating if available
  const avgRating = movie.reviews?.length
    ? (movie.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / movie.reviews.length).toFixed(1)
    : movie.imdbRating || null;

  // Directors & Actors
  const dirCastMember = (movie.cast || []).find(
    (c: any) => c.role?.toLowerCase().includes("director") || c.type?.toLowerCase().includes("director")
  );
  const directorObj = movie.director
    ? {
        "@type": "Person",
        name: movie.director,
        ...(dirCastMember?.castId ? { url: `${SITE_URL}/cast/${dirCastMember.castId}` } : {}),
      }
    : undefined;

  const CREW_ROLES_LOWER = ["director", "producer", "writer", "screenplay", "story", "dialogue", "music", "cinematographer", "editor", "choreographer", "art director", "costume", "sound", "stunt", "vfx", "singer", "lyricist"];
  const actorList = (movie.cast || [])
    .filter((c: any) => {
      const r = (c.role || "").toLowerCase();
      const t = (c.type || "").toLowerCase();
      return !CREW_ROLES_LOWER.some((cr) => r.includes(cr) || t.includes(cr));
    })
    .slice(0, 10)
    .map((c) => ({
      "@type": "Person",
      name: c.name,
      jobTitle: c.role || c.type || "Actor",
      ...(c.castId ? { url: `${SITE_URL}/cast/${c.castId}` } : {}),
    }));

  // ★ SEO FIX: Convert runtime string to ISO 8601 duration (required by schema.org/Movie)
  // Examples: "2h 15m" → "PT2H15M", "90 min" → "PT1H30M", "145" → "PT2H25M"
  function toIsoDuration(raw?: string): string | undefined {
    if (!raw) return undefined;
    if (/^PT/i.test(raw)) return raw.toUpperCase();
    let h = 0, m = 0;
    const hMatch = raw.match(/(\d+)\s*h/i);
    const mMatch = raw.match(/(\d+)\s*m(?:in)?/i);
    if (!hMatch && !mMatch) {
      const mins = parseInt(raw);
      if (!isNaN(mins)) { h = Math.floor(mins / 60); m = mins % 60; }
    } else {
      if (hMatch) h = parseInt(hMatch[1]);
      if (mMatch) m = parseInt(mMatch[1]);
    }
    if (h === 0 && m === 0) return undefined;
    return `PT${h > 0 ? h + "H" : ""}${m > 0 ? m + "M" : ""}`;
  }

  const movieEntity: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.synopsis || movie.story || `${movie.title} is an Odia feature film.`,
    url,
    image: movie.posterUrl || movie.thumbnailUrl,
    datePublished: movie.releaseDate || undefined,
    inLanguage: movie.language || "Odia",
    genre: movie.genre || ["Odia Movie"],
    duration: toIsoDuration(movie.runtime),
    ...(directorObj && { director: directorObj }),
    ...(actorList.length > 0 && { actor: actorList }),
  };

  // ★ SEO FIX: AggregateRating suppressed for unreleased movies and low-review-count pages.
  // - verdict "Upcoming" means the film has not released yet; "interested" votes are not reviews.
  // - Requiring ≥3 reviews prevents a single inflated rating (e.g. 10/10 from 1 vote) from
  //   appearing in structured data, which violates Google's rich result guidelines.
  const isReleased = movie.verdict !== "Upcoming";
  if (isReleased && avgRating && movie.reviews && movie.reviews.length >= 3) {
    movieEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      bestRating: "10",
      worstRating: "1",
      ratingCount: movie.reviews.length,
    };
  }

  // NOTE: boxOffice is NOT a standard schema.org/Movie property.
  // Box office data is expressed via the Article schema on the /box-office/[slug] page instead.

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
