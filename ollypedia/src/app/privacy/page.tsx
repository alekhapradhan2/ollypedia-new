// src/app/privacy/page.tsx
// Privacy Policy page — fixes the 404 caused by Footer.tsx linking to /privacy
// with no corresponding route. Styled to match the dark theme used in Footer
// (bg-black, gray-5xx text, orange-500 accents).
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read Ollypedia's Privacy Policy to learn how we collect, use, and protect your information while you browse Odisha's most complete Odia cinema encyclopedia.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const SECTIONS = [
  {
    heading: "1. Introduction",
    body: `Ollypedia ("we", "us", or "our") operates ollypedia.in, the premier Odia cinema (Ollywood) encyclopedia and fan community platform. We provide comprehensive movie information, cast profiles, box office tracking, song details, editorial news, and interactive community features including discussions and the Ollypedia Meter. This Privacy Policy outlines how we collect, store, process, and protect your personal information when you create an account, log in, and interact with our website.`,
  },
  {
    heading: "2. Information We Collect",
    body: `We collect information directly from you when you register and interact with Ollypedia, as well as automated technical data:`,
    list: [
      "Account Information: When you create a community account, we collect your email address, username, display name, and securely hashed password. You may also optionally provide a bio, avatar image, and social media handles in your public profile.",
      "Community Activity & UGC: We store your Ollypedia Meter votes (Skip, Timepass, Go for it, Perfection), discussion threads, comments, replies, and movie reviews to display them across the community platform.",
      "Authentication & Session Data: When logged in, we use secure, HTTP-only authentication cookies (JWT tokens) to keep you authenticated across sessions without exposing your credentials.",
      "Technical & Usage Data: IP address, browser type, operating system, pages viewed, time spent, and referring URLs, collected to protect against spam, enforce rate limiting, and improve site performance.",
    ],
  },
  {
    heading: "3. How We Use Your Information",
    body: `We process your personal information for the following legitimate purposes:`,
    list: [
      "To provide, maintain, and personalize your Ollypedia account and community experience.",
      "To calculate and display aggregate audience ratings, discussion threads, and meter scores for Odia movies.",
      "To secure our community platform, prevent spam, enforce rate limits, and sanitize user-submitted content against malicious code.",
      "To display public user profiles showing your badges, contributions, and community reputation.",
      "To serve non-intrusive and personalized advertisements via third-party advertising partners such as Google AdSense.",
      "To communicate important service announcements, security alerts, and account-related updates.",
    ],
  },
  {
    heading: "4. Password Security & Data Protection",
    body: `Your account security is our top priority. Passwords are never stored in plain text; they are encrypted using industry-standard cryptographic hashing (bcrypt with salt rounds). All authentication tokens are transmitted securely over HTTPS and stored in HTTP-only, SameSite-compliant cookies to prevent Cross-Site Scripting (XSS) and unauthorized access.`,
  },
  {
    heading: "5. Cookies & Tracking Technologies",
    body: `Ollypedia uses essential cookies (for authentication and session integrity) and third-party advertising cookies. Google AdSense and analytics partners may use cookies, web beacons, and similar technologies to serve advertisements based on your prior visits to our website or other websites. You can manage or disable advertising cookies through your browser settings or via Google's Ad Settings (adssettings.google.com).`,
  },
  {
    heading: "6. User-Generated Content & Public Visibility",
    body: `When you participate in community discussions, post comments, or cast votes on movies, this information becomes publicly visible to other visitors alongside your display name, username, and avatar. Please do not include sensitive personal details (such as phone numbers or financial information) in public discussion threads or comments.`,
  },
  {
    heading: "7. Data Sharing & Third Parties",
    body: `We do not sell, rent, or trade your personal information to third parties. We only share data with trusted third-party service providers (such as hosting infrastructure and database providers) strictly necessary to operate the platform, or when required by law or legal process.`,
  },
  {
    heading: "8. Data Retention & Your Rights",
    body: `We retain your account data and community contributions for as long as your account remains active. You have the right to access, update, or correct your profile information at any time via your account settings. You may also request account deletion or removal of your personal data by contacting us directly.`,
  },
  {
    heading: "9. Children's Privacy",
    body: `Ollypedia is designed for a general audience and does not knowingly collect personal information from children under the age of 13. If you believe that a child has created an account without parental consent, please contact us immediately so we can remove the account and associated data.`,
  },
  {
    heading: "10. Updates to This Policy",
    body: `We may periodically update this Privacy Policy to reflect platform enhancements, community feature additions, or legal requirements. Changes take effect upon posting with an updated revision date.`,
  },
  {
    heading: "11. Contact Us",
    body: `For privacy inquiries, account data requests, or support, please reach out through our Contact page or email us at support@ollypedia.in.`,
  },
];

export default function PrivacyPolicyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy - Ollypedia",
    "description": "Read Ollypedia's Privacy Policy to learn how we collect, use, and protect your information.",
    "url": `${SITE_URL}/privacy`,
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
      <main className="bg-black min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Header */}
          <div className="mb-10 sm:mb-12">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500 mb-3 flex items-center gap-2">
              <span className="w-5 h-px bg-orange-500/60" aria-hidden="true" />
              Legal
            </h3>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-3">
              Effective date: June 16, 2026
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8 sm:space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-sm sm:text-base font-semibold text-gray-300 mb-2.5">
                  {section.heading}
                </h2>
                <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed">
                  {section.body}
                </p>
                {section.list && (
                  <ul className="mt-3 space-y-1.5 list-disc list-inside text-gray-500 text-[13px] sm:text-sm leading-relaxed">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Related legal links */}
          <div className="mt-12 pt-6 border-t border-[#1c1c1c] flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href="/disclaimer"
              className="text-gray-600 text-xs hover:text-orange-400 transition-colors"
            >
              Disclaimer
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-gray-600 text-xs hover:text-orange-400 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 text-xs hover:text-orange-400 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}