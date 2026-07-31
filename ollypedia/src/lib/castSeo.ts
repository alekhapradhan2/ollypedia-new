// lib/castSeo.ts
// Comprehensive SEO module for Cast & Crew Profile pages
// Generates schema.org/Person knowledge graph, filmography links, & Google Knowledge Panel schemas

import { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "./seo";

export interface CastSeoDoc {
  _id: string;
  name: string;
  type?: string; // e.g. "Actor", "Director", "Music Director"
  roles?: string[];
  photo?: string;
  bio?: string;
  dob?: string;
  birthPlace?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    wikipedia?: string;
  };
  moviesList?: {
    _id: string;
    title: string;
    slug?: string;
    releaseDate?: string;
    posterUrl?: string;
  }[];
}

/**
 * Builds rich metadata for cast/crew profile page
 */
export function buildCastMeta(person: CastSeoDoc): Metadata {
  const profession = person.type || "Odia Film Actor & Artist";
  const title = `${person.name} (${profession}) – Biography, Age, Movies, Photos & Profile | ${SITE_NAME}`;
  const desc = `${person.name} is a renowned ${profession} in the Odia (Ollywood) film industry. Read ${person.name}'s complete biography, age, date of birth, upcoming & past Odia movies list, photos, and news on Ollypedia.`;

  return buildMeta({
    title,
    description: desc,
    keywords: [
      `${person.name}`,
      `${person.name} Odia actor`,
      `${person.name} biography`,
      `${person.name} movies list`,
      `${person.name} age`,
      `${person.name} photos`,
      `${person.name} Ollywood`,
      `Odia actor ${person.name}`,
    ],
    url: `/cast/${person._id}`,
    image: person.photo,
    type: "profile",
  });
}

/**
 * Generates schema.org/Person Knowledge Graph schema for Google Knowledge Panel eligibility
 */
export function generateCastJsonLd(person: CastSeoDoc) {
  const url = `${SITE_URL}/cast/${person._id}`;

  // Collect sameAs social links
  const sameAs: string[] = [];
  if (person.socials) {
    if (person.socials.instagram) sameAs.push(person.socials.instagram);
    if (person.socials.facebook)  sameAs.push(person.socials.facebook);
    if (person.socials.twitter)   sameAs.push(person.socials.twitter);
    if (person.socials.youtube)   sameAs.push(person.socials.youtube);
    if (person.socials.wikipedia) sameAs.push(person.socials.wikipedia);
  }

  // Filmography movie links schema
  const filmography = (person.moviesList || []).slice(0, 15).map((m) => ({
    "@type": "Movie",
    name: m.title,
    url: `${SITE_URL}/movie/${m.slug || m._id}`,
    ...(m.releaseDate ? { datePublished: m.releaseDate } : {}),
  }));

  const personSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: url,
    image: person.photo || undefined,
    jobTitle: person.type || "Odia Film Artist",
    description: person.bio || `${person.name} is an Odia film industry artist.`,
    ...(person.dob ? { birthDate: person.dob } : {}),
    ...(person.birthPlace ? { birthPlace: { "@type": "Place", name: person.birthPlace } } : {}),
    ...(sameAs.length > 0 && { sameAs: sameAs }),
    ...(filmography.length > 0 && { performerIn: filmography }),
  };

  // Breadcrumb
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cast & Crew", item: `${SITE_URL}/cast` },
      { "@type": "ListItem", position: 3, name: person.name, item: url },
    ],
  };

  return [personSchema, breadcrumb];
}
