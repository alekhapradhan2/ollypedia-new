export const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL  || "https://www.ollypedia.in";
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Ollypedia";

export function buildTitle(pageTitle: string) {
  return `${pageTitle} | ${SITE_NAME} – Odia Film Encyclopedia`;
}

export function buildMeta({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
}: {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: string;
}) {
  const ogImage = image || `${SITE_URL}/og-default.jpg`;
  const canonical = url ? `${SITE_URL}${url}` : SITE_URL;
  return {
    title,
    description,
    keywords: keywords?.join(", "),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

// JSON-LD structured data generators
export function movieJsonLd(movie: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.synopsis,
    url: `${SITE_URL}/movie/${movie.slug}`,
    image: movie.posterUrl || movie.thumbnailUrl,
    datePublished: movie.releaseDate,
    inLanguage: movie.language || "Odia",
    director: movie.director ? { "@type": "Person", name: movie.director } : undefined,
    genre: movie.genre,
    duration: movie.runtime,
    aggregateRating:
      movie.reviews?.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: (
              movie.reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) /
              movie.reviews.length
            ).toFixed(1),
            reviewCount: movie.reviews.length,
            bestRating: 10,
          }
        : undefined,
  };
}

export function articleJsonLd(blog: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: blog.excerpt || blog.seoDesc,
    url: `${SITE_URL}/blog/${blog.slug}`,
    image: blog.coverImage,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt,
    author: { "@type": "Organization", name: blog.author || SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  };
}

export function personJsonLd(cast: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: cast.name,
    description: cast.bio,
    url: `${SITE_URL}/cast/${cast._id}`,
    image: cast.photo,
    jobTitle: cast.type || (cast.roles || []).join(", "),
    sameAs: [cast.website, cast.instagram].filter(Boolean),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
