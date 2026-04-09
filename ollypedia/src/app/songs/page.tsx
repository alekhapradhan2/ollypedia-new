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

const PAGE_SIZE = 24;

async function getSongs({
  singer, musicDirector, movie, page,
}: {
  singer?: string; musicDirector?: string; movie?: string; page?: number;
}) {
  await connectDB();

  const songMatch: any = {};
  if (singer)        songMatch["media.songs.singer"]        = { $regex: singer,        $options: "i" };
  if (musicDirector) songMatch["media.songs.musicDirector"] = { $regex: musicDirector, $options: "i" };
  const movieMatch: any = {};
  if (movie) movieMatch.slug = movie;

  const currentPage = Math.max(1, page || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const basePipeline: any[] = [
    { $match: movieMatch },
    { $unwind: { path: "$media.songs", includeArrayIndex: "songIndex" } },
    ...(Object.keys(songMatch).length ? [{ $match: songMatch }] : []),
  ];

  const [songs, countResult] = await Promise.all([
    Movie.aggregate([
      ...basePipeline,
      { $sort: { title: 1, songIndex: 1 } },
      { $skip: skip },
      { $limit: PAGE_SIZE },
      { $project: {
        _id: 0,
        songIndex:     "$songIndex",
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
    ]),
    Movie.aggregate([...basePipeline, { $count: "total" }]),
  ]);

  const total = countResult[0]?.total ?? 0;

  // Filter options — only compute on unfiltered pages
  let singers: string[] = [];
  let directors: string[] = [];
  if (!singer && !musicDirector && !movie) {
    const opts = await Movie.aggregate([
      { $project: { s: "$media.songs.singer", d: "$media.songs.musicDirector" } },
      { $group: { _id: null, s: { $push: "$s" }, d: { $push: "$d" } } },
    ]);
    if (opts[0]) {
      singers   = [...new Set(opts[0].s.flat().filter(Boolean))].sort() as string[];
      directors = [...new Set(opts[0].d.flat().filter(Boolean))].sort() as string[];
    }
  }

  return { songs, singers, directors, total, currentPage, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function SongsPage({
  searchParams,
}: {
  searchParams: { singer?: string; musicDirector?: string; movie?: string; page?: string };
}) {
  const { singer, musicDirector, movie, page } = searchParams;
  const { songs, singers, directors, total, currentPage, totalPages } =
    await getSongs({ singer, musicDirector, movie, page: Number(page) || 1 });

  return (
    <SongsClient
      songs={songs}
      singers={singers}
      directors={directors}
      active={{ singer, musicDirector, movie }}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
    />
  );
}