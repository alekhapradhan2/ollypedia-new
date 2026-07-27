import { Suspense } from "react";
import type { Metadata } from "next";
import "../styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import NextTopLoader from 'nextjs-toploader';
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { GlobalLoader } from "@/components/layout/GlobalLoader";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} – The Odia Film Encyclopedia`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Ollypedia is the ultimate encyclopedia for Odia (Ollywood) cinema. Discover movies, actors, songs, reviews, box office, and news from the Odia film industry.",
  keywords: [
    "Odia movies", "Ollywood", "Odia films", "Odia cinema", "Odia actors",
    "Odia songs", "Ollywood news", "Odia movie reviews", "Odia film database",
    "official Odia movies", "legal Odia streaming", "watch Odia movies legally",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

import { GlobalMultiplexWrapper } from "@/components/ads/GlobalMultiplexWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5823659147566885"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="grain min-h-screen flex flex-col bg-[#0a0a0a]">
        <Suspense fallback={null}>
          <GlobalLoader />
        </Suspense>
        <ScrollToTop />
        <NextTopLoader color="#f97316" showSpinner={false} easing="ease" speed={200} />
        <Suspense fallback={<div className="h-16 border-b border-white/[0.07] bg-[#080808]/95" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <GlobalMultiplexWrapper />
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#f5f5f5",
              border: "1px solid #2a2a2a",
            },
          }}
        />
      </body>
    </html>
  );
}