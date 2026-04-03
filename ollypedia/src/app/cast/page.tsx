import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import { buildMeta } from "@/lib/seo";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata: Metadata = buildMeta({
  title: "Odia Actors & Actresses – Ollywood Cast Directory",
  description:
    "Browse the complete directory of Odia film actors, actresses, directors, singers and crew. Explore detailed profiles, filmographies and biographies of Ollywood celebrities.",
  keywords: ["Odia actors", "Ollywood cast", "Odia actress", "Odia film stars", "Babushaan", "Elina Samantray"],
  url: "/cast",
});

const ROLES = ["Actor", "Actress", "Director", "Singer", "Music Director", "Producer", "Lyricist"];

async function getCast(type?: string, page = 1) {
  await connectDB();
  const LIMIT = 24;
  const skip  = (page - 1) * LIMIT;
  const filter: any = type ? { $or: [{ type }, { roles: type }] } : {};
  const [cast, total] = await Promise.all([
    Cast.find(filter).sort({ name: 1 }).skip(skip).limit(LIMIT).lean(),
    Cast.countDocuments(filter),
  ]);
  return { cast, total };
}

export default async function CastPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string };
}) {
  const { type, page } = searchParams;
  const { cast, total } = await getCast(type, Number(page) || 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="Cast & Crew"
        subtitle={`${total} profiles in our database`}
      />

      {/* Role filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/cast"
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
            !type ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30"
          }`}
        >
          All
        </Link>
        {ROLES.map((r) => (
          <Link
            key={r}
            href={`/cast?type=${r}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              type === r ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30"
            }`}
          >
            {r}
          </Link>
        ))}
      </div>

      {/* SEO blurb */}
      <div className="mb-8 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <p className="text-gray-400 text-sm leading-relaxed">
          Explore Ollypedia's comprehensive directory of Odia film industry personalities. From veteran actors who
          have graced Odia cinema for decades to emerging talents reshaping Ollywood — our cast database covers
          actors, actresses, directors, music composers, playback singers, and more. Click any profile to see
          their full biography, filmography, and career highlights.
        </p>
      </div>

      {cast.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {cast.map((c: any) => (
            <Link key={String(c._id)} href={`/cast/${c._id}`} className="group text-center">
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#2a2a2a] group-hover:border-orange-500/50 transition-all duration-300 mb-3">
                <Image
                  src={c.photo || "/placeholder-person.jpg"}
                  alt={c.name}
                  fill
                  sizes="96px"
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <p className="font-semibold text-white text-sm line-clamp-1 group-hover:text-orange-400 transition-colors">
                {c.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.roles?.length ? c.roles.join(", ") : c.type || "Artist"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">No cast members found.</div>
      )}
    </div>
  );
}
