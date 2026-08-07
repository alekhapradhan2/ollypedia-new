// lib/boxOfficeSeo.ts
// Comprehensive SEO module for Box Office Collection pages
// Generates schema.org/Dataset, Event, MonetaryAmount, & FAQPage schemas for Google SERP features

import { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "./seo";

export interface BoxOfficeSeoDoc {
  movieTitle: string;
  movieSlug: string;
  totalNet?: string | number;
  totalGross?: string | number;
  day1Collection?: string | number;
  verdict?: string;
  releaseDate?: string;
  daysCount?: number;
  posterUrl?: string;
  boxOfficeDays?: { day: number; net: string | number; gross?: string | number; date?: string }[];
}

/**
 * Builds rich metadata for Box Office details page
 */
export function buildBoxOfficeMeta(bo: BoxOfficeSeoDoc): Metadata {
  const title = `${bo.movieTitle} Box Office Collection Day Wise – Total Net & Gross`;
  const totalNetFormatted = bo.totalNet ? `Total net collection is ${bo.totalNet}.` : "";
  const desc = `${bo.movieTitle} Box Office Collection report: Check day-wise net and gross collections, Day 1 opening collection, hit or flop verdict, and total box office earnings in Odia (Ollywood) theaters on Ollypedia. ${totalNetFormatted}`;

  const url = `/box-office/${bo.movieSlug}`;

  return buildMeta({
    title,
    description: desc,
    keywords: [
      `${bo.movieTitle} box office collection`,
      `${bo.movieTitle} day 1 box office collection`,
      `${bo.movieTitle} total collection`,
      `${bo.movieTitle} hit or flop`,
      `${bo.movieTitle} verdict`,
      `Odia movie box office ${bo.movieTitle}`,
      `Ollywood box office collection`,
      `Odia film collection report`,
    ],
    url,
    image: bo.posterUrl,
  });
}

/**
 * Generates Dataset, MonetaryAmount, & FAQPage structured JSON-LD schemas
 */
export function generateBoxOfficeJsonLd(bo: BoxOfficeSeoDoc) {
  const pageUrl = `${SITE_URL}/box-office/${bo.movieSlug}`;
  const movieUrl = `${SITE_URL}/movie/${bo.movieSlug}`;

  // Dataset Schema
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${bo.movieTitle} Box Office Collection Data`,
    description: `Day-wise theatrical box office collection data for Odia feature film ${bo.movieTitle}.`,
    url: pageUrl,
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    temporalCoverage: bo.releaseDate || undefined,
  };

  // FAQ Schema for instant Google SERP Answers
  const faqQuestions = [
    {
      "@type": "Question",
      name: `What is the total box office collection of ${bo.movieTitle}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: bo.totalNet
          ? `${bo.movieTitle} has collected a total net of ${bo.totalNet} at the Odia box office.`
          : `The total box office collection of ${bo.movieTitle} is currently being tracked on Ollypedia.`,
      },
    },
    {
      "@type": "Question",
      name: `Is ${bo.movieTitle} a hit or flop?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: bo.verdict
          ? `${bo.movieTitle} is declared as a ${bo.verdict} at the box office.`
          : `The theatrical verdict for ${bo.movieTitle} is updated based on total collections.`,
      },
    },
  ];

  if (bo.day1Collection) {
    faqQuestions.push({
      "@type": "Question",
      name: `How much did ${bo.movieTitle} collect on Day 1 (Opening Day)?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${bo.movieTitle} collected ${bo.day1Collection} net on its opening day in theaters.`,
      },
    });
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqQuestions,
  };

  // Breadcrumbs
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Box Office", item: `${SITE_URL}/box-office` },
      { "@type": "ListItem", position: 3, name: bo.movieTitle, item: pageUrl },
    ],
  };

  return [datasetSchema, faqSchema, breadcrumb];
}
