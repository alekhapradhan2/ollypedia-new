import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";
import { buildMeta, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MovieCard } from "@/components/movie/MovieCard";
import { Calendar, MapPin, Globe, Instagram, Film } from "lucide-react";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  await connectDB();
  const cast = await Cast.find({}, "_id").lean();
  return cast.map((c: any) => ({ id: String(c._id) }));
}

async function getCastMember(id: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(id);
  let member: any = null;
  if (isOid) {
    member = await Cast.findById(id).lean();
  } else {
    const nameQuery = id.replace(/-/g, " ").trim();
    member = await Cast.findOne({ name: { $regex: new RegExp("^" + nameQuery + "$", "i") } }).lean();
  }
  if (!member) return null;

  const movies = await Movie.find(
    { "cast.castId": member._id },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict imdbRating"
  ).sort({ releaseDate: -1 }).lean();

  return { ...member, moviesList: movies };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const person = await getCastMember(params.id);
  if (!person) return {};

  const roles = person.roles?.length ? person.roles.join(", ") : person.type || "Artist";
  return buildMeta({
    title: `${person.name} – Odia ${roles} | Biography & Movies`,
    description:
      person.bio?.slice(0, 160) ||
      `Explore ${person.name}'s biography, filmography, and career in Odia cinema (Ollywood). Discover all movies of ${person.name}.`,
    keywords: [person.name, "Odia actor", "Ollywood", roles, "Odia cinema"],
    image: person.photo,
    url: `/cast/${person._id}`,
  });
}

export default async function CastDetailPage({ params }: { params: { id: string } }) {
  const person = await getCastMember(params.id);
  if (!person) notFound();

  const roles = person.roles?.length ? person.roles.join(", ") : person.type || "Artist";
  const structuredData = [
    personJsonLd(person),
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Cast", url: "/cast" },
      { name: person.name, url: `/cast/${person._id}` },
    ]),
  ];

  // Placeholder bio if empty (for SEO)
  const bio = person.bio || `${person.name} is a prominent figure in the Odia film industry (Ollywood), 
  known for their remarkable contributions to Odia cinema. With a career spanning multiple films, 
  ${person.name} has established themselves as one of the celebrated ${roles.toLowerCase()}s in Ollywood. 
  Their performances have resonated deeply with Odia audiences, making them a household name across Odisha. 
  ${person.name} continues to be an active and influential presence in the Odia entertainment industry, 
  with fans eagerly awaiting their upcoming projects. Their dedication to the craft of ${roles.toLowerCase()} 
  has earned them critical acclaim and a loyal fanbase that extends beyond the borders of Odisha.`;

  return (
    <>
      {structuredData.map((sd, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      {/* Banner */}
      {person.banner && (
        <div className="relative h-56 overflow-hidden">
          <Image src={person.banner} alt={person.name} fill className="object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb crumbs={[{ label: "Cast", href: "/cast" }, { label: person.name }]} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            {/* Photo */}
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#2a2a2a]">
              <Image
                src={person.photo || "/placeholder-person.jpg"}
                alt={person.name}
                fill
                className="object-cover object-top"
                priority
              />
            </div>

            {/* Profile Card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Profile</h2>
              {[
                { icon: Calendar, label: "Date of Birth", value: person.dob },
                { icon: MapPin,   label: "Location",      value: person.location },
                { icon: Film,     label: "Known For",     value: roles },
                { icon: Globe,    label: "Gender",        value: person.gender },
              ].filter(({ value }) => value).map(({ icon, label, value }) => {
                const Icon = icon as any;
                return (
                  <div key={String(label)} className="flex items-start gap-3 py-2 border-b border-[#1f1f1f] last:border-0">
                    <Icon className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{label as string}</p>
                      <p className="text-sm text-white">{value as string}</p>
                    </div>
                  </div>
                );
              })}

              {/* Social links */}
              <div className="flex gap-2 pt-1">
                {person.website && (
                  <a href={person.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
                {person.instagram && (
                  <a href={`https://instagram.com/${person.instagram}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors">
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-2 space-y-8">
            {/* Name & Roles */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(person.roles?.length ? person.roles : [person.type || "Artist"]).map((r: string) => (
                  <span key={r} className="badge-orange">{r}</span>
                ))}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-1">{person.name}</h1>
              {person.moviesList?.length > 0 && (
                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                  <Film className="w-4 h-4" /> {person.moviesList.length} Odia films
                </p>
              )}
            </div>

            {/* Biography */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
              <h2 className="font-display font-bold text-2xl text-white mb-4">Biography</h2>
              <div className="space-y-4">
                {bio.split("\n").filter((p: string) => p.trim()).map((para: string, i: number) => (
                  <p key={i} className="text-gray-300 leading-relaxed">{para.trim()}</p>
                ))}
              </div>
            </div>

            {/* Filmography */}
            {person.moviesList?.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-2xl text-white mb-4">Filmography</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {person.moviesList.map((m: any) => (
                    <MovieCard key={String(m._id)} movie={m} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
