import { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "./seo";

export interface OTTMovie {
  _id: string;
  slug: string;
  title: string;
  posterUrl?: string;
  bannerUrl?: string;
  releaseDate?: string;
  synopsis?: string;
  ott?: {
    platform?: string;
    releaseDate?: string;
    status?: string;
    watchUrl?: string;
    languages?: string[];
    subtitles?: string[];
    runtime?: string;
    quality?: string;
  };
  cast?: { name: string; type: string }[];
  director?: string;
}

export function buildOttMeta(movie: OTTMovie): Metadata {
  const platform = movie.ott?.platform || "OTT";
  const status = movie.ott?.status || "Upcoming";
  const title = `Watch ${movie.title} Online | ${platform} Release Date, Streaming Details`;
  const desc = `Find where to watch ${movie.title} online. Check ${platform} release date, streaming languages, subtitles, trailer, and complete OTT information on Ollypedia.`;

  return buildMeta({
    title,
    description: desc,
    keywords: [
      `Watch ${movie.title} online`,
      `${movie.title} OTT release date`,
      `${movie.title} on ${platform}`,
      `Odia Movie OTT Release`,
      `Latest Odia OTT Release`,
      `Ollywood OTT`,
    ],
    url: `/movie/${movie.slug || movie._id}`, // Consolidates canonical authority to main movie page
    image: movie.bannerUrl || movie.posterUrl,
  });
}

export function generateOttJsonLd(movie: OTTMovie) {
  const movieUrl = `${SITE_URL}/movie/${movie.slug || movie._id}`;
  const ottPageUrl = `${SITE_URL}/ott/${movie.slug || movie._id}`;
  
  const movieSchema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    image: movie.posterUrl,
    url: movieUrl,
    sameAs: ottPageUrl,
    description: movie.synopsis,
    datePublished: movie.releaseDate,
    director: movie.director ? { "@type": "Person", name: movie.director } : undefined,
    actor: movie.cast?.map(c => ({ "@type": "Person", name: c.name })) || [],
    offers: movie.ott?.watchUrl ? {
      "@type": "Offer",
      url: movie.ott.watchUrl,
      availability: "https://schema.org/InStock",
      price: "0",
      priceCurrency: "INR",
      seller: { "@type": "Organization", name: movie.ott.platform }
    } : undefined
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "OTT Releases", item: `${SITE_URL}/ott` },
      { "@type": "ListItem", position: 3, name: `${movie.title} OTT Release`, item: ottPageUrl }
    ]
  };

  return [movieSchema, breadcrumb];
}
