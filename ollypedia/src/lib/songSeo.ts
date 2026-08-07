// lib/songSeo.ts
// Comprehensive SEO module for Song & Music Album pages
// Generates schema.org/MusicRecording, MusicComposition, MusicAlbum, & VideoObject schemas

import { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "./seo";

export interface SongSeoDoc {
  title: string;
  singer?: string;
  musicDirector?: string;
  lyricist?: string;
  duration?: string;
  ytId?: string;
  movieTitle: string;
  movieSlug: string;
  posterUrl?: string;
  releaseDate?: string;
  songIndex?: number;
  songSlug?: string;
}

/**
 * Builds rich metadata for song details page
 */
export function buildSongMeta(song: SongSeoDoc): Metadata {
  const title = `${song.title} Song MP3 Lyrics & Video – ${song.movieTitle}`;
  const artists = [song.singer, song.musicDirector, song.lyricist].filter(Boolean).join(", ");
  const desc = `Listen to ${song.title} full Odia song from ${song.movieTitle}. ${artists ? `Sung by ${artists}.` : ""} Watch official video, read lyrics, and view full audio credits on Ollypedia.`;

  const url = `/songs/${song.movieSlug}/${song.songIndex || 0}${song.songSlug ? `/${song.songSlug}` : ""}`;

  return buildMeta({
    title,
    description: desc,
    keywords: [
      `${song.title} song`,
      `${song.title} Odia song`,
      `${song.title} MP3`,
      `${song.title} lyrics`,
      `${song.title} ${song.movieTitle}`,
      ...(song.singer ? [`${song.singer} songs`] : []),
      ...(song.musicDirector ? [`${song.musicDirector} music`] : []),
      `Odia movie songs`,
      `Ollywood music`,
    ],
    url,
    image: song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : song.posterUrl,
    type: "music.song",
  });
}

/**
 * Generates MusicRecording, MusicAlbum, & VideoObject structured JSON-LD schemas
 */
export function generateSongJsonLd(song: SongSeoDoc) {
  const songUrl = `${SITE_URL}/songs/${song.movieSlug}/${song.songIndex || 0}${song.songSlug ? `/${song.songSlug}` : ""}`;
  const movieUrl = `${SITE_URL}/movie/${song.movieSlug}`;

  // Singer / Artists array
  const singerList = song.singer
    ? song.singer.split(/[,&]/).map((s) => ({
        "@type": "Person",
        name: s.trim(),
      }))
    : [];

  const musicRecordingSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    url: songUrl,
    inAlbum: {
      "@type": "MusicAlbum",
      name: `${song.movieTitle} (Original Motion Picture Soundtrack)`,
      url: movieUrl,
      image: song.posterUrl,
    },
    ...(singerList.length > 0 && { byArtist: singerList }),
    ...(song.musicDirector && {
      composer: {
        "@type": "Person",
        name: song.musicDirector,
      },
    }),
    ...(song.lyricist && {
      lyricist: {
        "@type": "Person",
        name: song.lyricist,
      },
    }),
    ...(song.duration && { duration: song.duration }),
  };

  // VideoObject schema for YouTube embed
  const videoObjectSchema = song.ytId
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${song.title} – ${song.movieTitle} Official Video Song`,
        description: `Watch official video song ${song.title} from Odia movie ${song.movieTitle}.`,
        thumbnailUrl: [
          `https://img.youtube.com/vi/${song.ytId}/maxresdefault.jpg`,
          `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg`,
        ],
        uploadDate: song.releaseDate || new Date().toISOString(),
        embedUrl: `https://www.youtube.com/embed/${song.ytId}`,
      }
    : null;

  // Breadcrumbs
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Odia Songs", item: `${SITE_URL}/songs` },
      { "@type": "ListItem", position: 3, name: song.movieTitle, item: movieUrl },
      { "@type": "ListItem", position: 4, name: song.title, item: songUrl },
    ],
  };

  return [musicRecordingSchema, videoObjectSchema, breadcrumb].filter(Boolean);
}
