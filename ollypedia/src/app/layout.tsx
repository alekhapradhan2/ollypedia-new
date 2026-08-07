import type { Metadata } from "next";
import "../styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import NextTopLoader from 'nextjs-toploader';
import dynamic from "next/dynamic";

// ── Use dynamic imports (ssr:false) for components that call useSearchParams().
// Static import + <Suspense> causes BAILOUT_TO_CLIENT_SIDE_RENDERING on every
// page, which means Googlebot sees a placeholder div instead of the real Navbar.
const GlobalLoader = dynamic(
  () => import("@/components/layout/GlobalLoader").then((m) => ({ default: m.GlobalLoader })),
  { ssr: false }
);
const ScrollToTop = dynamic(
  () => import("@/components/layout/ScrollToTop").then((m) => ({ default: m.ScrollToTop })),
  { ssr: false }
);

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

import Script from "next/script";
import { GlobalMultiplexWrapper } from "@/components/ads/GlobalMultiplexWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          id="adsense-init"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5823659147566885"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="grain min-h-screen flex flex-col bg-[#0a0a0a]">
        {/* GlobalLoader and ScrollToTop are rendered client-only (ssr:false dynamic import)
            so they never trigger a Suspense SSR bailout. */}
        <GlobalLoader />
        <ScrollToTop />
        <NextTopLoader color="#f97316" showSpinner={false} easing="ease" speed={200} />
        <Navbar />
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