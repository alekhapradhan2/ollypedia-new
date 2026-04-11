import type { Metadata } from "next";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import News from "@/models/News";
import { buildMeta } from "@/lib/seo";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Calendar, Newspaper } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = buildMeta({
  title: "Odia Film News – Latest Ollywood Updates",
  description:
    "Stay updated with the latest news from Odia film industry (Ollywood). Get breaking news, film announcements, actor interviews, and box office updates.",
  keywords: ["Odia film news", "Ollywood news", "Odia cinema news", "Odia movie updates"],
  url: "/news",
});

async function getNews(page = 1) {
  await connectDB();
  const LIMIT = 16;
  const [news, total] = await Promise.all([
    News.find({ published: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .lean(),
    News.countDocuments({ published: true }),
  ]);
  return { news, total };
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const { news, total } = await getNews(Number(searchParams.page) || 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="Odia Film News"
        subtitle="Latest updates from Ollywood"
      />

      <div className="mb-8 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <p className="text-gray-400 text-sm leading-relaxed">
          Get the latest news and updates from the Odia film industry. From new movie announcements and casting
          news to box office results and celebrity interviews — Ollypedia keeps you connected with everything
          happening in Ollywood.
        </p>
      </div>

      {news.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.map((item: any, i: number) => (
            <article key={String(item._id)} className={`card overflow-hidden flex gap-0 ${i === 0 ? "md:col-span-2" : ""}`}>
              {item.imageUrl && (
                <div className={`relative flex-shrink-0 ${i === 0 ? "aspect-video w-full md:w-1/2" : "w-28 h-full"}`}>
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-blue">{item.category || "News"}</span>
                  {item.newsType === "video" && <span className="badge-red">Video</span>}
                </div>
                <h2 className={`font-display font-bold text-white mb-2 leading-snug ${i === 0 ? "text-xl" : "text-sm line-clamp-2"}`}>
                  {item.title}
                </h2>
                {(i === 0 || item.content) && (
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {item.content?.replace(/<[^>]+>/g, "").slice(0, 200)}…
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {item.movieTitle && <span className="text-orange-400">📽 {item.movieTitle}</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Newspaper className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No news articles yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
