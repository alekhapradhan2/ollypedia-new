// import type { Metadata } from "next";
// import Image from "next/image";
// import Link from "next/link";
// import { connectDB } from "@/lib/db";
// import Blog from "@/models/Blog";
// import { buildMeta } from "@/lib/seo";
// import { Clock, User, Calendar } from "lucide-react";

// export const metadata: Metadata = buildMeta({
//   title: "Ollywood Blog | Odia Cinema News, Reviews & Guides",
//   description: "Read the latest Ollywood blog posts — movie reviews, actor profiles, song guides, and everything about Odia cinema.",
//   url: "/blog",
// });

// async function getBlogs() {
//   await connectDB();
//   const blogs = await Blog.find({ published: true })
//     .select("title slug excerpt category tags coverImage author readTime views createdAt featured")
//     .sort({ featured: -1, createdAt: -1 })
//     .limit(48)
//     .lean();
//   return blogs as any[];
// }

// export default async function BlogPage() {
//   const blogs = await getBlogs();
//   const featured = blogs.filter((b) => b.featured);
//   const rest     = blogs.filter((b) => !b.featured);

//   return (
//     <main className="min-h-screen bg-[#0a0a0a] text-white">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

//         <div className="mb-8">
//           <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight mb-2">
//             Ollywood Blog
//           </h1>
//           <p className="text-gray-400 text-sm md:text-base">
//             Movie reviews, actor profiles, song guides and more from Odia cinema.
//           </p>
//         </div>

//         {/* Featured */}
//         {featured.length > 0 && (
//           <section className="mb-10">
//             <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-4">Featured</p>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//               {featured.slice(0, 2).map((b) => (
//                 <Link key={String(b._id)} href={`/blog/${b.slug}`}
//                   className="group block card overflow-hidden hover:-translate-y-0.5 transition-all duration-300">
//                   {b.coverImage && (
//                     <div className="relative aspect-video">
//                       <Image src={b.coverImage} alt={b.title} fill
//                         className="object-cover group-hover:scale-105 transition-transform duration-500" />
//                       <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
//                       <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white">
//                         {b.category}
//                       </span>
//                     </div>
//                   )}
//                   <div className="p-4">
//                     <h2 className="font-bold text-white text-lg leading-snug mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
//                       {b.title}
//                     </h2>
//                     {b.excerpt && (
//                       <p className="text-gray-400 text-sm line-clamp-2 mb-3">{b.excerpt}</p>
//                     )}
//                     <div className="flex items-center gap-3 text-xs text-gray-500">
//                       <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.author || "Ollypedia Team"}</span>
//                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.readTime || 5} min</span>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>
//           </section>
//         )}

//         {/* All posts */}
//         {rest.length > 0 ? (
//           <section>
//             <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">All Articles</p>
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//               {rest.map((b) => (
//                 <Link key={String(b._id)} href={`/blog/${b.slug}`}
//                   className="group block card overflow-hidden hover:-translate-y-0.5 transition-all duration-300">
//                   {b.coverImage && (
//                     <div className="relative aspect-video">
//                       <Image src={b.coverImage} alt={b.title} fill
//                         className="object-cover group-hover:scale-105 transition-transform duration-500" />
//                     </div>
//                   )}
//                   <div className="p-4">
//                     <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">{b.category}</span>
//                     <h2 className="font-semibold text-white text-sm leading-snug mt-1 mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
//                       {b.title}
//                     </h2>
//                     {b.excerpt && (
//                       <p className="text-gray-500 text-xs line-clamp-2 mb-3">{b.excerpt}</p>
//                     )}
//                     <div className="flex items-center gap-3 text-xs text-gray-600">
//                       <span className="flex items-center gap-1">
//                         <Calendar className="w-3 h-3" />
//                         {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
//                       </span>
//                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.readTime || 5} min</span>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>
//           </section>
//         ) : (
//           !featured.length && (
//             <div className="text-center py-20 text-gray-500">
//               <p className="text-lg mb-2">No blog posts yet.</p>
//               <p className="text-sm">Check back soon for Ollywood articles and guides.</p>
//             </div>
//           )
//         )}

//       </div>
//     </main>
//   );
// }
