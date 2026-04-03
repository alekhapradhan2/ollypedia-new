import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { SongsClient } from "./SongsClient";
import { buildMeta } from "@/lib/seo";

export const metadata: Metadata = buildMeta({
  title: "Odia Songs – Ollywood Music Database",
  description:
    "Explore thousands of Odia songs from Ollywood movies. Filter by singer, music director, or movie. Watch YouTube videos and read lyrics of your favourite Odia film songs.",
  keywords: ["Odia songs", "Ollywood music", "Odia film songs", "Odia singer", "Odia music director"],
  url: "/songs",
});

async function getSongs({ singer, musicDirector, movie }: {
  singer?: string; musicDirector?: string; movie?: string;
}) {
  await connectDB();
  const songMatch: any = {};
  if (singer)      songMatch["media.songs.singer"]        = { $regex: singer,      $options: "i" };
  if (musicDirector) songMatch["media.songs.musicDirector"] = { $regex: musicDirector, $options: "i" };

  const movieMatch: any = {};
  if (movie) movieMatch.slug = movie;

  const pipeline: any[] = [
    { $match: movieMatch },
    { $unwind: "$media.songs" },
    ...(Object.keys(songMatch).length ? [{ $match: songMatch }] : []),
    { $project: {
      _id: 0,
      songId:        "$media.songs._id",
      title:         "$media.songs.title",
      singer:        "$media.songs.singer",
      musicDirector: "$media.songs.musicDirector",
      lyricist:      "$media.songs.lyricist",
      ytId:          "$media.songs.ytId",
      thumbnailUrl:  "$media.songs.thumbnailUrl",
      description:   "$media.songs.description",
      lyrics:        "$media.songs.lyrics",
      movieTitle:    "$title",
      movieSlug:     "$slug",
      movieId:       "$_id",
    }},
    { $sort: { movieTitle: 1 } },
  ];

  
  const songs = await Movie.aggregate(pipeline);

  // Get filter options
  const singers = Array.from(new Set(songs.map((s: any) => s.singer).filter(Boolean))).sort() as string[];
  const directors = Array.from(new Set(songs.map((s: any) => s.musicDirector).filter(Boolean))).sort() as string[];

  return { songs, singers, directors };
}

export default async function SongsPage({
  searchParams,
}: {
  searchParams: { singer?: string; musicDirector?: string; movie?: string };
}) {
  const { singer, musicDirector, movie } = searchParams;
  const { songs, singers, directors } = await getSongs({ singer, musicDirector, movie });

  return <SongsClient songs={songs} singers={singers} directors={directors} active={{ singer, musicDirector, movie }} />;
}
