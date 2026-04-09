// src/app/blog/odia-guides/[slug]/page.tsx
//
// Route: /blog/odia-guides/odia-movies, /blog/odia-guides/history-of-ollywood, etc.
// These are STATIC SEO landing pages — separate from your DB-driven /blog/[slug] route.
//
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { buildMeta } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface GuideConfig {
  title: string;
  metaTitle: string;
  metaDesc: string;
  h1: string;
  keywords: string[];
  relatedLinks: { label: string; href: string }[];
  sections: { heading: string; body: string }[];
}

const GUIDES: Record<string, GuideConfig> = {
  "odia-movies": {
    title: "Know About Odia Movies",
    metaTitle: "Odia Movies — Everything You Need to Know About Ollywood",
    metaDesc: "A complete guide to Odia movies and Ollywood cinema. History, best films, top actors, and how to explore Odia cinema.",
    h1: "Odia Movies — A Complete Guide to Ollywood Cinema",
    keywords: ["odia movies", "ollywood", "what is ollywood", "odia cinema guide"],
    relatedLinks: [
      { label: "Odia Movies 2026",   href: "/movies/2026" },
      { label: "Latest Odia Movies", href: "/movies/latest" },
      { label: "Upcoming Movies",    href: "/movies/upcoming" },
      { label: "Best Odia Songs",    href: "/blog/odia-guides/best-odia-songs" },
    ],
    sections: [
      {
        heading: "What Is Ollywood?",
        body: "The term 'Ollywood' is a portmanteau of Odia (or Oriya) and Hollywood, coined to describe the Odia-language film industry based primarily in Bhubaneswar and Cuttack, Odisha. The industry produces over 50 films annually, spanning genres including romance, action, mythology, comedy, and thriller. Odia films are distributed across Odisha, Jharkhand, Chhattisgarh, and West Bengal, as well as to the Odia diaspora worldwide.",
      },
      {
        heading: "History of Odia Cinema",
        body: "The first Odia sound film, Sita Bibaha, was released in 1936, marking the dawn of a new cultural era for Odisha. Through the 1950s and 60s, mythological and devotional films dominated, drawing massive crowds to rural screening halls. The 1970s and 80s ushered in a golden age of romantic melodramas, with superstar actors and legendary playback singers creating songs that remain beloved classics to this day. The 21st century saw Ollywood embrace modern production values, digital filmmaking, and international distribution.",
      },
      {
        heading: "Top Genres in Odia Cinema",
        body: "Action films with high-octane stunt sequences dominate the box office, while romantic films set against Odisha's scenic landscapes attract family audiences. Mythological and devotional films based on Odia folk deities maintain a dedicated following, and a growing wave of social dramas address contemporary issues like urbanisation and women's empowerment. Comedy films rooted in Odia humour round out the genre landscape.",
      },
      {
        heading: "How to Explore Odia Movies on Ollypedia",
        body: "Ollypedia is the most comprehensive database of Odia cinema. Browse films by release year, explore blockbuster hits, or check out upcoming releases. Each movie page includes the full song list, cast details, director credits, and audience ratings — everything you need to decide what to watch next.",
      },
    ],
  },
  "history-of-ollywood": {
    title: "History of Ollywood",
    metaTitle: "History of Ollywood | The Complete Story of Odia Cinema",
    metaDesc: "Explore the complete history of Ollywood — from the first Odia film in 1936 to today's modern blockbusters. A definitive timeline of Odia cinema.",
    h1: "History of Ollywood — From 1936 to the Modern Era",
    keywords: ["history of ollywood", "odia cinema history", "ollywood timeline"],
    relatedLinks: [
      { label: "Know About Odia Movies", href: "/blog/odia-guides/odia-movies" },
      { label: "Top 10 Odia Movies",     href: "/blog/odia-guides/top-10-odia-movies" },
      { label: "Famous Odia Actors",     href: "/blog/odia-guides/odia-actors" },
    ],
    sections: [
      {
        heading: "The Birth of Odia Talkies (1930s–1940s)",
        body: "The first Odia feature film, Sita Bibaha (1936), directed by Mohan Sundar Deb Goswami, established the blueprint for early Odia cinema: mythological narratives, classical music, and stories drawn from Hindu epics. The film was produced in Kolkata, as Odisha lacked its own studio infrastructure at the time. The 1940s brought gradual growth, with studios and distribution networks slowly taking shape within the state.",
      },
      {
        heading: "The Golden Age (1960s–1970s)",
        body: "This era produced Ollywood's most enduring cultural icons. Legendary actors became household names, while composers created soundtracks that Odia families still play at weddings and festivals decades later. Social themes entered the Odia screen for the first time, with films tackling poverty, untouchability, and women's rights alongside the popular romantic dramas that dominated the box office.",
      },
      {
        heading: "The Transition Years (1980s–1990s)",
        body: "Cable television and VHS tapes disrupted the theatrical business, forcing Ollywood to adapt. Action films with flashy stunts and catchy soundtracks emerged as the dominant format, catering to mass audiences hungry for escapist entertainment. This era minted a new generation of superstars who would define Odia cinema for the next two decades.",
      },
      {
        heading: "The Digital Revolution (2000s–2010s)",
        body: "Digital cameras, non-linear editing, and affordable distribution changed the game entirely. Low-budget films with strong scripts could now compete with big-budget productions. A new wave of directors brought fresh sensibilities — urban stories, horror films, and youth romances — expanding Ollywood's audience beyond its traditional demographic.",
      },
      {
        heading: "Ollywood Today (2020s)",
        body: "Today's Ollywood is a confident, ambitious industry. Pan-India releases, OTT premieres, and international film festival selections are no longer anomalies but expectations. Streaming platforms like MX Player, ZEE5, and Amazon Prime Video have given Odia films unprecedented global reach. The next chapter — being written right now with the current year's releases — promises to be the most exciting yet.",
      },
    ],
  },
  "top-10-odia-movies": {
    title: "Top 10 Odia Movies",
    metaTitle: "Top 10 Odia Movies of All Time | Best Ollywood Films You Must Watch",
    metaDesc: "The definitive list of top 10 Odia movies ever made. Best Ollywood films ranked by audience ratings, box office, and cultural impact.",
    h1: "Top 10 Odia Movies of All Time",
    keywords: ["top 10 odia movies", "best odia movies ever", "must watch ollywood films"],
    relatedLinks: [
      { label: "Blockbuster Movies",  href: "/movies/blockbuster" },
      { label: "Best Odia Songs",     href: "/blog/odia-guides/best-odia-songs" },
      { label: "Famous Odia Actors",  href: "/blog/odia-guides/odia-actors" },
      { label: "Odia Movies 2024",    href: "/movies/2024" },
    ],
    sections: [
      {
        heading: "What Makes a Great Odia Film?",
        body: "The best Odia movies share certain qualities: an authentic connection to Odia culture and landscape, memorable music that transcends the screen, and performances that resonate across generations. They capture the spirit of Odisha — its festivals, its folk traditions, its social contradictions — with honesty and artistry. The films that endure are those that balance commercial appeal with genuine storytelling craft.",
      },
      {
        heading: "The Criteria for This List",
        body: "Films on this list have been evaluated across three dimensions: audience ratings from verified viewers, box-office performance relative to their era's standards, and lasting cultural impact as measured by continued public recognition. A film that scored exceptionally on all three dimensions earns its place regardless of genre or decade of release.",
      },
      {
        heading: "Explore the Full Catalogue",
        body: "While this guide highlights the all-time greats, Ollypedia's full catalogue covers every Odia film ever documented. Browse blockbuster films, discover recent releases, or explore the upcoming slate. Each film page includes the full soundtrack — because in Odia cinema, the songs are always as important as the story. The live rankings on the blockbuster page are updated in real time based on the latest audience data.",
      },
    ],
  },
  "best-odia-songs": {
    title: "Best Odia Songs List",
    metaTitle: "Best Odia Songs of All Time | Greatest Ollywood Music Ever",
    metaDesc: "Discover the best Odia songs ever recorded. A curated list of iconic Ollywood tracks across decades with artist details and movie names.",
    h1: "Best Odia Songs — The Greatest Ollywood Music of All Time",
    keywords: ["best odia songs", "greatest odia songs", "top ollywood songs list"],
    relatedLinks: [
      { label: "Classic Old Songs",  href: "/songs/category/classics" },
      { label: "Trending Songs",     href: "/songs/category/trending" },
      { label: "Latest Songs",       href: "/songs/category/latest" },
      { label: "Top Singers",        href: "/songs/category/singers" },
    ],
    sections: [
      {
        heading: "What Makes a Great Odia Song?",
        body: "Odia music is one of India's richest regional musical traditions, blending classical Odissi ragas, devotional bhajans, folk rhythms, and contemporary pop into a sound that is instantly recognisable and deeply emotive. The best Odia film songs combine melodic sophistication with lyrical poetry — Odia is a language of extraordinary literary richness, and the finest songwriters harness that tradition in every line.",
      },
      {
        heading: "The Golden Era (1960s–70s)",
        body: "Soulful melodies composed by masters featured classical-influenced arrangements and poetic lyrics rooted in the Odia literary tradition. These songs are the backbone of Ollypedia's classics collection — tracks that have been played at Odia festivals and family gatherings for half a century without losing any of their power.",
      },
      {
        heading: "The Masala Era (1980s–90s)",
        body: "High-energy numbers with synthesiser-driven beats were designed for mass-audience appeal. Many became folk anthems sung at Odia festivals and cultural programmes. Despite their commercial origins, the best songs from this era demonstrate remarkable melodic inventiveness and are now recognised as classics in their own right.",
      },
      {
        heading: "The Modern Era (2000s–present)",
        body: "Today's Odia film music is a confident fusion of traditional sounds with contemporary pop, hip-hop, and EDM production. Young composers are unafraid to experiment while remaining rooted in the Odia musical tradition. The result is a stream of songs that top streaming charts while still sounding unmistakably Odia.",
      },
    ],
  },
  "odia-actors": {
    title: "Famous Odia Actors",
    metaTitle: "Famous Odia Actors | Top Ollywood Stars & Their Best Movies",
    metaDesc: "Meet the most famous Odia actors in Ollywood. Profiles of top stars with their best movies, hit songs, awards, and career highlights.",
    h1: "Famous Odia Actors — The Stars of Ollywood",
    keywords: ["famous odia actors", "ollywood actors", "odia film stars"],
    relatedLinks: [
      { label: "Cast & Crew",         href: "/cast" },
      { label: "Top 10 Odia Movies",  href: "/blog/odia-guides/top-10-odia-movies" },
      { label: "Blockbuster Movies",  href: "/movies/blockbuster" },
      { label: "Top Singers",         href: "/songs/category/singers" },
    ],
    sections: [
      {
        heading: "The Legends",
        body: "The foundation of Ollywood's acting tradition was laid by icons whose screen presence redefined Odia heroism. These veterans set a standard of craft and professionalism that every subsequent generation of Odia actors has aspired to match. Their films remain essential viewing for anyone seeking to understand the cultural heritage of Odia cinema.",
      },
      {
        heading: "The Modern Superstars",
        body: "Today's Ollywood is driven by a new generation of bankable stars who combine acting ability with social media savvy and pan-India ambitions. These actors consistently deliver films that break box-office records and generate chart-topping soundtracks, making them cultural phenomena beyond the screen. Many have expanded into production and direction, shaping the industry's future as well as its present.",
      },
      {
        heading: "Rising Stars",
        body: "Every year, Ollywood discovers fresh talent through debut films, web series, and reality shows. These rising stars bring contemporary sensibilities and new storytelling possibilities to Odia cinema, ensuring the industry's creative vitality for years to come. Several have already demonstrated range and charisma that suggest major careers ahead.",
      },
      {
        heading: "Explore on Ollypedia",
        body: "Each actor on Ollypedia has a dedicated profile page featuring their complete filmography, awards history, and song appearances. The Cast & Crew section covers every Odia actor, director, cinematographer, and music composer in our comprehensive database — the most complete record of Ollywood talent available anywhere.",
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cfg = GUIDES[params.slug];
  if (!cfg) return {};
  return buildMeta({ title: cfg.metaTitle, description: cfg.metaDesc, keywords: cfg.keywords, url: `/blog/odia-guides/${params.slug}` });
}

function JsonLd({ slug, cfg }: { slug: string; cfg: GuideConfig }) {
  const base = "https://ollypedia.com";
  const article = {
    "@context": "https://schema.org", "@type": "Article",
    headline: cfg.h1, url: `${base}/blog/odia-guides/${slug}`,
    publisher: { "@type": "Organization", name: "Ollypedia", url: base },
  };
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
      { "@type": "ListItem", position: 3, name: "Odia Guides", item: `${base}/blog/odia-guides` },
      { "@type": "ListItem", position: 4, name: cfg.title, item: `${base}/blog/odia-guides/${slug}` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default function OdiaGuidePage({ params }: { params: { slug: string } }) {
  const cfg = GUIDES[params.slug];
  if (!cfg) notFound();

  const otherGuides = Object.entries(GUIDES).filter(([s]) => s !== params.slug);

  return (
    <>
      <JsonLd slug={params.slug} cfg={cfg} />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Breadcrumb crumbs={[{ label: "Blog", href: "/blog" }, { label: "Odia Guides", href: "/blog/odia-guides" }, { label: cfg.title }]} />

          <div className="flex items-center gap-3 mt-6 mb-5">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-orange-500 text-xs font-semibold uppercase tracking-widest">Ollypedia Guide</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight mb-10">
            {cfg.h1}
          </h1>

          {/* Article body */}
          <article className="space-y-8">
            {cfg.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-white mb-3">{section.heading}</h2>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">{section.body}</p>
              </section>
            ))}
          </article>

          {/* Related links */}
          <div className="mt-12 p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl">
            <h2 className="text-base font-semibold text-white mb-4">Explore More</h2>
            <div className="flex flex-wrap gap-2">
              {cfg.relatedLinks.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-xs text-gray-400 hover:text-orange-400 bg-[#181818] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Other guides */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherGuides.slice(0, 4).map(([slug, guide]) => (
              <Link key={slug} href={`/blog/odia-guides/${slug}`}
                className="flex items-center gap-3 p-4 bg-[#111] border border-[#1e1e1e] rounded-xl hover:border-orange-500/30 transition-all group">
                <BookOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors line-clamp-1">{guide.title}</span>
                <ChevronRight className="w-3 h-3 text-gray-600 ml-auto flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}