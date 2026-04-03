import { SITE_URL } from "@/lib/seo";

export async function GET() {
  const content = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
