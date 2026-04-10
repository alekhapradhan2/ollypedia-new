import BlogDetailClient from "./BlogDetailClient";

export const dynamic = "force-dynamic"; // 🔥 VERY IMPORTANT

export default function Page({ params }: { params: { slug: string } }) {
  return <BlogDetailClient slug={params.slug} />;
}