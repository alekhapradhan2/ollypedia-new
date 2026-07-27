import { SITE_URL } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Have a question, suggestion, or want to contribute? Contact Ollypedia today. We welcome contributions from fans and film researchers.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Ollypedia",
    "description": "Have a question, suggestion, or want to contribute? Contact Ollypedia today.",
    "url": `${SITE_URL}/contact`,
    "publisher": {
      "@type": "Organization",
      "name": "Ollypedia",
      "url": SITE_URL,
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
