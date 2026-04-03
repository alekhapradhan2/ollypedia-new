import type { Metadata } from "next";
import { buildMeta, SITE_NAME } from "@/lib/seo";
import { Film, Award, Users, Globe } from "lucide-react";

export const metadata: Metadata = buildMeta({
  title: "About Ollypedia – The Odia Film Encyclopedia",
  description:
    "Learn about Ollypedia, the most comprehensive online database for Odia cinema (Ollywood). Our mission is to document, celebrate and promote Odia film heritage.",
  url: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
          About <span className="text-orange-500">Ollypedia</span>
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          The most comprehensive encyclopedia of Odia cinema on the internet.
        </p>
      </div>

      <div className="prose-odia mb-12">
        <h2>Our Mission</h2>
        <p>
          Ollypedia was founded with a singular mission: to create the definitive online resource for Odia cinema
          (Ollywood) — a platform where fans, film professionals, researchers, and enthusiasts can discover,
          explore, and celebrate the rich heritage of Odia films. We believe that Odia cinema, one of India's
          oldest regional film industries, deserves a dedicated space that honours its past, celebrates its present,
          and looks forward to its future.
        </p>

        <h2>What We Offer</h2>
        <p>
          Ollypedia is more than just a movie database. We are a comprehensive knowledge hub for everything
          related to Odia cinema. Our platform provides detailed information on thousands of Odia films spanning
          over eight decades, from the first Odia talkie <em>Sita Bibaha</em> (1936) to the latest Ollywood
          blockbusters. For each film, we provide complete cast and crew details, songs, trailer, box office
          collection data, synopsis, plot analysis, critical reviews, and user ratings.
        </p>
        <p>
          Our Cast & Crew section features detailed biographies and filmographies of hundreds of Odia film
          personalities — actors, actresses, directors, producers, music directors, lyricists, and playback singers.
          We believe every contributor to Odia cinema deserves to have their work documented and celebrated.
        </p>
        <p>
          The Songs section of Ollypedia is one of its most unique features. We have curated an extensive database
          of Odia film songs, allowing users to explore music by singer, music director, or movie. Each song entry
          includes YouTube video links, singer credits, and wherever possible, full lyrics. This makes Ollypedia
          a go-to destination for Odia music lovers as well.
        </p>

        <h2>Celebrating Odia Film Heritage</h2>
        <p>
          Odia cinema has a rich and storied history. Over nine decades, Ollywood has produced hundreds of films
          that reflect the culture, traditions, mythology, and social fabric of Odisha. From devotional films
          based on Lord Jagannath's stories to contemporary action thrillers set in modern Odisha, Odia films
          have always carried a distinct identity that resonates with millions of viewers.
        </p>
        <p>
          Ollypedia is committed to documenting this heritage comprehensively. We work to ensure that even older,
          less-documented Odia films have a presence on our platform. Our editorial team researches and verifies
          information before publishing, ensuring that Ollypedia remains a trusted and reliable source.
        </p>

        <h2>Our Blog</h2>
        <p>
          Beyond the database, Ollypedia publishes in-depth blog content that goes beyond basic facts. Our writers
          — passionate fans and cinema enthusiasts — contribute articles covering movie reviews, actor spotlights,
          historical retrospectives, box office analysis, and more. This content is designed to provide real value
          to readers who want to understand Odia cinema at a deeper level.
        </p>

        <h2>Contact Us</h2>
        <p>
          We are constantly working to improve and expand Ollypedia. If you have information to contribute,
          corrections to suggest, or would like to collaborate, please reach out through our{" "}
          <a href="/contact">Contact page</a>. We welcome contributions from fans, film professionals,
          and researchers who share our passion for Odia cinema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: Film,  label: "Movies",        value: "500+" },
          { icon: Users, label: "Cast Profiles",  value: "1000+" },
          { icon: Globe, label: "Songs",          value: "5000+" },
          { icon: Award, label: "Years of Cinema", value: "88+" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 text-center">
            <Icon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
