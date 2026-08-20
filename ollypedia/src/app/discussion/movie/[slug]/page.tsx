import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME, buildMeta } from "@/lib/seo";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import MovieVote from "@/models/community/MovieVote";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { MovieDiscussionClient } from "@/components/community/MovieDiscussionClient";

export const revalidate = 30; // ISR cache for 30 seconds

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  await connectDB();
  const slug = params.slug;

  const movie = (await Movie.findOne({
    $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
  })
    .select("title posterUrl thumbnailUrl releaseDate language genre")
    .lean()) as any;

  if (!movie) {
    return { title: "Movie Discussion | Ollypedia" };
  }

  const year = movie.releaseDate
    ? ` (${new Date(movie.releaseDate).getFullYear()})`
    : "";
  const title = `${movie.title}${year} Community Discussion, Reviews & Meter`;
  const description = `Join the official community discussion on ${movie.title}. Vote in the Ollypedia Meter (Skip, Timepass, Go for it, Perfection), share reviews, and discuss with Odia cinema fans.`;
  const image = movie.posterUrl || movie.thumbnailUrl;

  return buildMeta({
    title,
    description,
    image,
    url: `/movie/${movie.slug || slug}`, // Canonical consolidates authority to the main movie page
    keywords: [
      `${movie.title} community`,
      `${movie.title} discussion`,
      `${movie.title} review`,
      `${movie.title} meter rating`,
      `${movie.title} audience verdict`,
      "Ollypedia Meter",
      "Odia movie community",
      "Odia movie discussion",
      "Ollywood community review",
    ],
  });
}

export default async function MovieDiscussionPage({
  params,
}: {
  params: { slug: string };
}) {
  await connectDB();
  const slug = params.slug;

  const movie = await Movie.findOne({
    $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
  })
    .select(
      "title slug posterUrl thumbnailUrl bannerUrl releaseDate language genre synopsis verdict runtime media ott boxOffice"
    )
    .lean() as any;

  if (!movie) {
    notFound();
  }

  const movieId = movie._id;

  // Aggregate meter stats and counts
  const [voteAgg, threads, totalThreads, totalComments, distinctVoters] =
    await Promise.all([
      MovieVote.aggregate([
        { $match: { movieId } },
        { $group: { _id: "$voteType", count: { $sum: 1 } } },
      ]),
      DiscussionThread.find({ movieId, status: "active" })
        .populate("userId", "username displayName avatar role status")
        .sort({ lastActivityAt: -1 })
        .limit(20)
        .lean(),
      DiscussionThread.countDocuments({ movieId, status: "active" }),
      DiscussionComment.countDocuments({ movieId, status: "active" }),
      MovieVote.distinct("userId", { movieId }),
    ]);

  const counts: Record<string, number> = {
    skip: 0,
    timepass: 0,
    go_for_it: 0,
    perfection: 0,
  };

  let totalVotes = 0;
  voteAgg.forEach((item: any) => {
    if (counts[item._id] !== undefined) {
      counts[item._id] = item.count;
      totalVotes += item.count;
    }
  });

  const calculatePercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  const initialMeter = {
    totalVotes,
    skip: { count: counts.skip, percentage: calculatePercentage(counts.skip) },
    timepass: {
      count: counts.timepass,
      percentage: calculatePercentage(counts.timepass),
    },
    goForIt: {
      count: counts.go_for_it,
      percentage: calculatePercentage(counts.go_for_it),
    },
    perfection: {
      count: counts.perfection,
      percentage: calculatePercentage(counts.perfection),
    },
    participantsCount: distinctVoters.length,
    threadsCount: totalThreads,
    commentsCount: totalComments,
  };

  // Structured Data Schema for Discussion Forum
  const discussionPageUrl = `${SITE_URL}/discussion/movie/${movie.slug || movie._id}`;
  const movieCanonicalUrl = `${SITE_URL}/movie/${movie.slug || movie._id}`;
  const discussionSchema = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: `${movie.title} Live Discussion & Ollypedia Meter`,
    url: movieCanonicalUrl,
    mainEntityOfPage: discussionPageUrl,
    description: `Audience discussion and live meter rating for the Odia film ${movie.title}.`,
    about: {
      "@type": "Movie",
      name: movie.title,
      url: `${SITE_URL}/movie/${movie.slug || movie._id}`,
      image: movie.posterUrl || movie.thumbnailUrl,
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: totalComments,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(discussionSchema) }}
      />

      <MovieDiscussionClient
        movie={{
          _id: movie._id.toString(),
          title: movie.title,
          slug: movie.slug,
          posterUrl: movie.posterUrl,
          thumbnailUrl: movie.thumbnailUrl,
          bannerUrl: movie.bannerUrl,
          releaseDate: movie.releaseDate,
          language: movie.language,
          genre: movie.genre,
          synopsis: movie.synopsis,
          verdict: movie.verdict,
          runtime: movie.runtime,
          hasSongs: Boolean(movie.media?.songs?.length),
          hasTrailers: Boolean(movie.media?.videos?.length),
          hasOtt: Boolean(movie.ott?.platform),
          hasBoxOffice: Boolean(movie.boxOffice?.total || movie.boxOffice?.opening),
        }}
        initialMeter={initialMeter}
        initialThreads={JSON.parse(JSON.stringify(threads))}
      />
    </>
  );
}
