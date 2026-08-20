import type { Metadata } from "next";
import "../styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import { GlobalMultiplexWrapper } from "@/components/ads/GlobalMultiplexWrapper";

// ── Static imports — safe because GlobalLoader and ScrollToTop now internally
// wrap their useSearchParams() calls in <Suspense> boundaries, which is the
// correct Next.js App Router pattern. Previously these used dynamic(ssr:false)
// which emitted BAILOUT_TO_CLIENT_SIDE_RENDERING in every page's server HTML,
// making the <body> appear empty to Googlebot.
import { GlobalLoader } from "@/components/layout/GlobalLoader";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

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

import { CommunityAuthProvider } from "@/context/CommunityAuthContext";
import { AuthModal } from "@/components/community/AuthModal";

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
        <CommunityAuthProvider>
          {/* GlobalLoader and ScrollToTop use static imports.
              Their useSearchParams() calls are wrapped in internal <Suspense>
              boundaries so they never cause a BAILOUT_TO_CLIENT_SIDE_RENDERING. */}
          <GlobalLoader />
          <ScrollToTop />
          <NextTopLoader color="#f97316" showSpinner={false} easing="ease" speed={200} />
          <Navbar />
          <main className="flex-1">{children}</main>
          <GlobalMultiplexWrapper />
          <Footer />
          <AuthModal />
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
        </CommunityAuthProvider>
      </body>
    </html>
  );
}