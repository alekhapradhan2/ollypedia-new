// lib/trailerSeo.ts
// SEO library dedicated to the Trailers module
// Generates: JSON-LD schemas, metadata, SEO prose, FAQs
// Used by: /trailers and /trailers/[movieSlug] pages

import { buildMeta, SITE_URL } from "./seo";
import { formatReleaseDate, getReleaseYear } from "./dateUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrailerMovieDoc {
  _id: string;
  title: string;
  slug?: string;
  genre?: string[];
  releaseDate?: string;
  releaseTBA?: boolean;
  director?: string;
  producer?: string;
  budget?: string;
  language?: string;
  synopsis?: string;
  story?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  runtime?: string;
  contentRating?: string;
  verdict?: string;
  status?: string;
  cast?: { name: string; type?: string; role?: string; photo?: string; castId?: string }[];
  media?: {
    trailer?: { ytId?: string; url?: string; thumbnailUrl?: string };
    teaser?: { ytId?: string; url?: string; thumbnailUrl?: string };
    motionPoster?: { ytId?: string; url?: string };
    firstLook?: { ytId?: string; url?: string };
    trailerReleaseDate?: string;
    songs?: { title?: string; singer?: string; ytId?: string }[];
    videos?: {
      ytId?: string;
      url?: string;
      thumbnailUrl?: string;
      type?: string;
      status?: string;
    }[];
  };
  productionId?: { name?: string } | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface VideoAsset {
  ytId?: string;
  url?: string;
  thumbnailUrl?: string;
  type?: string;
  status?: string;
}

export function getPrimaryVideo(m: TrailerMovieDoc): VideoAsset | null {
  const vids = m.media?.videos;
  if (!vids || vids.length === 0) return null;
  
  // Priority order
  const priority = ["Trailer", "Teaser", "Glimpse", "First Look", "Motion Poster"];
  
  for (const type of priority) {
    const video = vids.find(v => v.type === type && v.ytId);
    if (video) return video;
  }
  
  // Fallback to first video with a ytId if none of the specific types matched
  return vids.find(v => !!v.ytId) || null;
}

export function hasTrailer(m: TrailerMovieDoc) {
  return m.media?.videos?.some(v => v.type === "Trailer" && v.ytId) || false;
}
export function hasTeaser(m: TrailerMovieDoc) {
  return m.media?.videos?.some(v => v.type === "Teaser" && v.ytId) || false;
}
export function hasMotionPoster(m: TrailerMovieDoc) {
  return m.media?.videos?.some(v => v.type === "Motion Poster" && v.ytId) || false;
}
export function hasFirstLook(m: TrailerMovieDoc) {
  return m.media?.videos?.some(v => (v.type === "First Look" || v.type === "Glimpse") && v.ytId) || false;
}
export function hasAnyVideo(m: TrailerMovieDoc) {
  return !!getPrimaryVideo(m);
}

export function fmtDate(iso?: string, precision?: string): string {
  if (!iso) return "TBA";
  return formatReleaseDate(iso, precision, "long") || "TBA";
}

export function getTrailerYear(m: TrailerMovieDoc): number {
  const y = getReleaseYear(m.releaseDate);
  if (y) return parseInt(y, 10);
  return new Date().getFullYear();
}

// ─── Meta builder ─────────────────────────────────────────────────────────────

export function buildTrailerMeta() {
  const year = new Date().getFullYear();
  return buildMeta({
    title: `Latest Ollywood Movie Trailers (${year}) | Upcoming Odia Movie Teasers`,
    description:
      `Watch the latest Ollywood movie trailers, teasers, first looks, and upcoming Odia movie previews. Explore complete cast, crew, release dates, posters, production details, and trailer updates only on Ollypedia.`,
    keywords: [
      "Ollywood movie trailers",
      "Odia movie trailers",
      `Odia movie trailers ${year}`,
      "upcoming Odia movies trailers",
      "Ollywood teasers",
      "Odia film teasers",
      "Odia movie first look",
      "Ollywood motion posters",
      "latest Odia movie trailers",
      "new Ollywood trailers",
      "Odia upcoming movie release date",
      "official Ollywood trailer",
      "Odia cinema trailers",
      "Ollywood new release trailer",
      "watch Odia movie trailers online",
    ],
    url: "/trailers",
  });
}

export function buildIndividualTrailerMeta(m: TrailerMovieDoc) {
  const year = getTrailerYear(m);
  const genres = (m.genre || []).slice(0, 2).join(", ");
  const titleLine = `${m.title} Official Trailer | Odia ${genres || "Movie"} ${year}`;
  const desc = m.synopsis
    ? `Watch the official trailer of ${m.title} (${year}). ${m.synopsis.slice(0, 120)}… See cast, crew, songs, release date, and more on Ollypedia.`
    : `Watch the official trailer, teaser & first look of the Odia movie ${m.title} (${year}). Cast, crew, release date, songs, and complete movie details on Ollypedia.`;

  return buildMeta({
    title: titleLine,
    description: desc,
    keywords: [
      `${m.title} trailer`,
      `${m.title} teaser`,
      `${m.title} ${year}`,
      `${m.title} Odia movie`,
      `${m.director || ""} movie trailer`.trim(),
      "Ollywood trailer",
      "Odia movie trailer",
      `Odia movie ${year}`,
      ...(m.genre || []).map((g) => `${g} Odia movie`),
    ].filter(Boolean),
    url: `/trailers/${m.slug || m._id}`,
    image: m.posterUrl || m.thumbnailUrl,
    type: "video.movie",
  });
}

// ─── JSON-LD Schemas ─────────────────────────────────────────────────────────

export function trailerCollectionJsonLd(movies: TrailerMovieDoc[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ollywood Movie Trailers | Odia Film Teasers & First Looks",
    description:
      "Watch the latest Ollywood movie trailers, official teasers, motion posters, and first looks. Complete Odia cinema trailer hub on Ollypedia.",
    url: `${SITE_URL}/trailers`,
    mainEntity: {
      "@type": "ItemList",
      name: "Latest Ollywood Trailers",
      numberOfItems: movies.length,
      itemListElement: movies.slice(0, 20).map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: m.title,
        url: `${SITE_URL}/trailers/${m.slug || m._id}`,
        image: m.posterUrl || m.thumbnailUrl,
      })),
    },
  };
}

export function videoObjectJsonLd(m: TrailerMovieDoc) {
  const vid = getPrimaryVideo(m);
  if (!vid || !vid.ytId) return null;
  
  const isTrailer = vid.type === "Trailer";
  const year = getTrailerYear(m);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${m.title} Official ${vid.type || "Trailer"} | Ollywood ${year}`,
    description:
      m.synopsis ||
      `Watch the official ${vid.type || "video"} of ${m.title}, an upcoming Odia (Ollywood) movie releasing in ${year}.`,
    thumbnailUrl: [
      vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.ytId}/maxresdefault.jpg`,
    ],
    uploadDate: m.media?.trailerReleaseDate || m.releaseDate || new Date().toISOString().split("T")[0],
    embedUrl: `https://www.youtube.com/embed/${vid.ytId}`,
    contentUrl: `https://www.youtube.com/watch?v=${vid.ytId}`,
    publisher: {
      "@type": "Organization",
      name: "Ollypedia",
      url: SITE_URL,
    },
    director: m.director ? { "@type": "Person", name: m.director } : undefined,
    genre: (m.genre || []).join(", "),
    inLanguage: m.language || "Odia",
  };
}

export function trailerMovieJsonLd(m: TrailerMovieDoc) {
  const vid = getPrimaryVideo(m);
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: m.title,
    description: m.synopsis || `${m.title} is an Odia (Ollywood) film directed by ${m.director || "a notable director"}.`,
    url: `${SITE_URL}/trailers/${m.slug || m._id}`,
    sameAs: `${SITE_URL}/movie/${m.slug || m._id}`,
    image: m.posterUrl || m.thumbnailUrl,
    datePublished: m.releaseDate,
    inLanguage: m.language || "Odia",
    director: m.director ? { "@type": "Person", name: m.director } : undefined,
    producer: m.producer ? { "@type": "Person", name: m.producer } : undefined,
    genre: m.genre,
    duration: m.runtime,
    trailer: vid?.ytId
      ? {
          "@type": "VideoObject",
          name: `${m.title} Official ${vid.type || "Trailer"}`,
          embedUrl: `https://www.youtube.com/embed/${vid.ytId}`,
          thumbnailUrl: vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.ytId}/maxresdefault.jpg`,
        }
      : undefined,
    actor: (m.cast || [])
      .filter((c) => c.type?.toLowerCase() !== "crew")
      .slice(0, 5)
      .map((c) => ({ "@type": "Person", name: c.name })),
  };
}

export function trailerFaqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function trailerBreadcrumbJsonLd(movie?: TrailerMovieDoc) {
  const items = [
    { name: "Home", item: `${SITE_URL}/` },
    { name: "Trailers", item: `${SITE_URL}/trailers` },
  ];
  if (movie) {
    items.push({ name: `${movie.title} Trailer`, item: `${SITE_URL}/trailers/${movie.slug || movie._id}` });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

// ─── Auto-generated SEO Content ──────────────────────────────────────────────

export function generateTrailerSeoContent(m: TrailerMovieDoc): string {
  const year = getTrailerYear(m);
  const genres = (m.genre || []).join(" and ") || "various genres";
  const director = m.director || "a renowned Odia filmmaker";
  const producer = m.producer || "a leading Ollywood production house";
  const cast = (m.cast || [])
    .filter((c) => !c.type || c.type.toLowerCase() !== "crew")
    .slice(0, 4)
    .map((c) => c.name)
    .join(", ");
  const lang = m.language || "Odia";
  const relDate = fmtDate(m.releaseDate);
  const production = (m.productionId as any)?.name || "a reputed production house";
  const synopsis = m.synopsis || `${m.title} is a highly anticipated Odia movie that has been generating significant buzz across Ollywood.`;
  const runtime = m.runtime || "";
  const budget = m.budget || "";

  return `
${m.title} (${year}) is one of the most anticipated Odia movies of the year. Directed by ${director} and produced by ${producer} under the banner of ${production}, this ${genres} film brings together a talented ensemble cast to deliver a compelling cinematic experience for Ollywood audiences.

${synopsis}

${cast ? `The film stars ${cast} in prominent roles, with each performer bringing their unique energy and versatility to the story. Ollywood fans have been eagerly awaiting every update on this movie, and the official trailer release has only amplified the excitement.` : ""}

**Official Trailer Details**

The official trailer of ${m.title} is now available for viewers across the world. The trailer offers a glimpse into the rich visual storytelling, high-production values, and strong character portrayals that define this Ollywood production. ${hasTrailer(m) ? `You can watch the full official trailer of ${m.title} embedded right here on Ollypedia — the most comprehensive Odia cinema database.` : `The official trailer is expected to drop soon. Stay tuned to Ollypedia for instant updates on ${m.title}.`}

${hasTeaser(m) ? `**Official Teaser**\n\nBefore the full trailer, the makers released an official teaser of ${m.title} that created a massive stir on social media. The teaser successfully builds curiosity and showcases the cinematic scale and mood of the film.` : ""}

**About the Film**

${m.title} is a ${lang}-language ${genres} film set to release${relDate !== "TBA" ? ` on ${relDate}` : " soon"}. ${runtime ? `With a runtime of approximately ${runtime}, the film promises to be a complete entertainer.` : ""} ${budget ? `The film has been made with a reported budget of ${budget}, reflecting the ambition and scale of this Ollywood production.` : ""}

${director}'s vision for ${m.title} reflects the evolution of Odia cinema — a blend of strong narrative, compelling performances, and technical finesse that can compete with the best productions from other Indian regional film industries.

**Cast and Crew Highlights**

${cast ? `${cast} lead the cast of ${m.title}, delivering performances that promise to leave a lasting impression. The combination of seasoned veterans and fresh faces creates a dynamic on-screen chemistry that audiences will love.` : "The film features a talented ensemble cast handpicked by the director."}

The technical crew includes some of Ollywood's finest craftsmen, ensuring that every frame of ${m.title} is a visual treat. From the cinematography to the background score, every element is meticulously crafted to support the narrative.

**Music and Songs**

${(m.media?.songs || []).length > 0 ? `${m.title} features ${m.media?.songs?.length} songs that have been composed to complement the film's emotional arc. The soundtrack is expected to be one of the major highlights of this Odia movie.` : `The music of ${m.title} has been carefully composed to align with the film's narrative arc, adding emotional depth to every scene.`}

**Release Information**

${m.title} is scheduled for ${relDate !== "TBA" ? `a theatrical release on ${relDate}` : "release soon"}. The film will be released in ${lang} and is targeted at audiences across Odisha and the global Odia diaspora. Ollypedia will keep you updated with all the latest developments including box office updates, reviews, and post-release content.

**Why Watch ${m.title}?**

For fans of Odia cinema, ${m.title} represents everything that Ollywood stands for — authentic storytelling, vibrant performances, and a deep connection to Odia culture and values. ${director}'s direction is expected to elevate this film above typical genre entries, making it a must-watch for anyone who follows Odia movies.

Stay connected with Ollypedia — Odisha's most trusted Odia film encyclopedia — for all updates, trailers, teasers, songs, cast details, and box office reports for ${m.title} and every other Odia movie.
`.trim();
}

// ─── Landing page SEO introduction (~700-1000 words) ─────────────────────────

export function getTrailerPageSeoIntro(): string {
  const year = new Date().getFullYear();
  return `
Ollywood — the vibrant and culturally rich Odia film industry — produces some of the most entertaining and emotionally resonant cinema in India. At Ollypedia, we bring you the most comprehensive collection of **Ollywood movie trailers**, official teasers, motion posters, first looks, and upcoming Odia movie previews, all in one place. Whether you are searching for the latest trailer of a blockbuster Odia action film or curious about an upcoming romantic drama, this is your ultimate destination.

**What is an Ollywood Movie Trailer?**

A movie trailer is the official promotional video released by the production house to give audiences a preview of the film's story, cast, music, and visual scale. For Odia cinema, trailers have become a cultural event — fans and enthusiasts often watch trailers millions of times across YouTube and social media platforms, generating enormous engagement even before the film hits theatres. The Ollywood trailer launch events have become major social occasions, drawing crowds, media, and industry celebrities alike.

**Types of Video Content on This Page**

On this trailers page, you will find several distinct types of video content for Odia movies:

*Official Trailers* are the primary promotional videos, typically 2–4 minutes long, that showcase the best moments of the film without giving away the full story. An official Odia movie trailer usually includes key dialogues, song sequences, action set-pieces, and emotional highlights.

*Official Teasers* are shorter promotional videos — usually 30–90 seconds — released before the full trailer. Teasers are designed to build curiosity and generate early buzz. Many Odia films first release a teaser months before the actual theatrical date.

*Motion Posters* are animated versions of the film's poster, often set to music. They are a popular format in Ollywood, used to announce a film's title, release date, or major casting.

*First Look Posters and Videos* are the very first visual reveals of a film, typically showing the protagonist in character. A first look release often goes viral across Odia social media within minutes of publication.

**Why Ollywood Trailers Matter**

The trailer of an Odia movie is often the deciding factor for whether a film achieves wide theatrical distribution or not. A powerful, well-crafted trailer can boost advance bookings, increase social media conversations, attract distributors across Odisha, and generate national and international attention. In recent years, Ollywood trailers have consistently achieved millions of views on YouTube, reflecting the growing digital audience for Odia cinema.

Directors like Sabyasachi Mohapatra, Hara Patnaik, and Suman Mohapatra have delivered trailers that set new benchmarks for production quality in Odia cinema. Actors like Babushan Mohanty, Anubhav Mohanty, and Elina Samantray have consistently delivered trailer-worthy performances that set audience expectations sky-high.

**${year} Odia Movie Trailers**

The year ${year} has been exceptional for Ollywood, with several high-profile films releasing their official trailers. From action films to romantic dramas and devotional movies, the diversity of Odia cinema in ${year} is truly impressive. Each trailer represents not just a film, but the collective effort of hundreds of artists, technicians, and producers who are dedicated to taking Odia cinema to new heights.

**Upcoming Odia Movie Releases**

Some of the most anticipated Odia films are currently in production or post-production, with their trailers expected very soon. Ollypedia tracks every announcement, teaser drop, and full trailer launch for all upcoming Odia movies. Our database is updated regularly, ensuring you never miss a single trailer release from Ollywood.

**Odia Cinema's Production Houses**

Major production houses in Ollywood — including Insight Entertainment, Viacom18 Studios (Odia), Ira Movies, and Ollytainment — regularly invest in high-quality trailers as part of their marketing campaigns. These production houses understand the importance of a compelling trailer in building audience anticipation and are now producing trailers at par with other major Indian regional film industries.

**How to Use This Page**

You can browse trailers by category using the filters below. Filter by:
- **Genre** — Action, Romance, Drama, Comedy, Thriller, Horror, Devotional, Family
- **Status** — Upcoming, Released
- **Content Type** — Trailer, Teaser, Motion Poster, First Look
- **Month/Year** — Browse by specific time periods

You can also use the search bar to find trailers by movie name, actor, director, or production house. Every trailer card on this page links to the complete movie page on Ollypedia, where you can explore the full cast, crew, songs, reviews, box office performance, and more.

Ollypedia is dedicated to being the most reliable, comprehensive, and up-to-date source for Odia cinema information. Bookmark this page and check back regularly for the latest Ollywood trailer releases, teasers, and first looks.
`.trim();
}

// ─── FAQ Generator ────────────────────────────────────────────────────────────

export function generateTrailerFaqs(m: TrailerMovieDoc): FaqItem[] {
  const year = getTrailerYear(m);
  const director = m.director || "the director";
  const genres = (m.genre || []).join(" and ") || "Odia";
  const relDate = fmtDate(m.releaseDate);
  const cast = (m.cast || [])
    .filter((c) => !c.type || c.type.toLowerCase() !== "crew")
    .slice(0, 2)
    .map((c) => c.name)
    .join(" and ");
  const lang = m.language || "Odia";
  const runtime = m.runtime;
  const songs = m.media?.songs || [];

  const faqs: FaqItem[] = [
    {
      question: `When is ${m.title} releasing?`,
      answer:
        relDate !== "TBA"
          ? `${m.title} is scheduled to release on ${relDate}. The film will have a theatrical release across Odisha and other regions.`
          : `The release date of ${m.title} is yet to be announced officially. Stay tuned to Ollypedia for the latest updates on the release date.`,
    },
    {
      question: `Who is the director of ${m.title}?`,
      answer: `${m.title} is directed by ${director}. ${director} is a well-known filmmaker in Ollywood and has delivered several notable productions in Odia cinema.`,
    },
    {
      question: `Who are the lead actors in ${m.title}?`,
      answer:
        cast
          ? `${m.title} stars ${cast} in the lead roles. The film features a talented cast that includes both established Ollywood stars and promising new talent.`
          : `${m.title} features a carefully selected ensemble cast. Visit the full movie page on Ollypedia for the complete cast and crew details.`,
    },
    {
      question: `Is the official trailer of ${m.title} out?`,
      answer:
        hasTrailer(m)
          ? `Yes, the official trailer of ${m.title} has been released. You can watch the full official trailer of ${m.title} right here on this page, embedded directly for your convenience.`
          : hasTeaser(m)
          ? `The official teaser of ${m.title} has been released. The full official trailer is expected to be released closer to the film's release date. Check back here for updates.`
          : `The official trailer of ${m.title} has not been released yet. The trailer is expected to drop soon. Ollypedia will update this page as soon as the trailer is out.`,
    },
    {
      question: `What genre is ${m.title}?`,
      answer: `${m.title} is a ${genres} film in the ${lang} language. The film belongs to the ${genres} genre and is expected to appeal to fans of ${genres} Odia cinema.`,
    },
    {
      question: `What is the runtime of ${m.title}?`,
      answer:
        runtime
          ? `${m.title} has an approximate runtime of ${runtime}. The final runtime may vary slightly based on the certified version.`
          : `The official runtime of ${m.title} has not been announced yet. Ollypedia will update this page with the confirmed runtime once it is available.`,
    },
    {
      question: `How many songs are in ${m.title}?`,
      answer:
        songs.length > 0
          ? `${m.title} features ${songs.length} song${songs.length > 1 ? "s" : ""} in its soundtrack. The songs have been composed to complement the film's narrative and emotional tone.`
          : `The complete soundtrack details of ${m.title} are yet to be revealed. Ollypedia will update this page with all song titles, singers, and music director details once announced.`,
    },
    {
      question: `Where can I watch ${m.title} online?`,
      answer: `${m.title} is an Odia (Ollywood) film releasing in ${year}. For official digital streaming information, please check the film's official channels. Ollypedia tracks OTT release announcements for all Odia movies and will update this page accordingly.`,
    },
  ];

  return faqs;
}
