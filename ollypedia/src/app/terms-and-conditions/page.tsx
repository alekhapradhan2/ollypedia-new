// app/terms-and-conditions/page.tsx
// Static page — no data fetching required.

import type { Metadata } from "next";
import Link from "next/link";
import { Film, ChevronRight, Shield, Eye, FileText, AlertCircle, Scale, Mail } from "lucide-react";
import { SITE_URL } from "@/lib/seo";

// ── SEO Metadata ──────────────────────────────────────────────────────────────
// ── SEO Metadata ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Terms & Conditions — Odia Cinema Encyclopedia & Community",
  description:
    "Read the Terms and Conditions for using Ollypedia, the comprehensive Odia cinema encyclopedia and fan community. Learn about user accounts, community discussions, voting rules, and acceptable use.",
  keywords: [
    "Ollypedia terms and conditions",
    "Ollypedia terms of use",
    "Ollywood community guidelines",
    "Odia cinema website policy",
    "user account terms",
    "Ollypedia Meter rules",
  ],
  alternates: {
    canonical: `${SITE_URL}/terms-and-conditions`,
  },
  openGraph: {
    title: "Terms & Conditions — Ollypedia",
    description:
      "Read our Terms and Conditions covering user accounts, community discussions, Ollypedia Meter voting, content use, and privacy protection.",
    url: `${SITE_URL}/terms-and-conditions`,
    siteName: "Ollypedia",
    type: "website",
  },
};

// ── Section data ──────────────────────────────────────────────────────────────
const sections = [
  {
    id: "acceptance",
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: [
      "By accessing and using Ollypedia (www.ollypedia.in), creating an account, or participating in our community discussions and voting, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to any part of these terms, please discontinue using the website.",
      "These terms apply to all visitors, registered members, and contributors. We may update these terms periodically to reflect new features or legal requirements; continued use of Ollypedia after changes constitutes your acceptance of the updated terms.",
    ],
  },
  {
    id: "user-accounts",
    icon: Shield,
    title: "2. User Accounts & Security",
    highlight: true,
    content: [
      "Registration & Access: To participate in community discussions, start threads, reply to comments, or cast votes on the Ollypedia Meter, you must create a user account. You agree to provide accurate and truthful information during registration.",
      "Password & Credential Security: You are responsible for safeguarding your login credentials. Ollypedia encrypts all passwords using cryptographic hashing (bcrypt) and protects sessions with secure HTTP-only cookies. You must notify us immediately if you suspect unauthorized access to your account.",
      "Account Responsibility: You are responsible for all activities and user-generated content submitted under your account.",
    ],
  },
  {
    id: "community-conduct",
    icon: Eye,
    title: "3. Community Guidelines & User Content (UGC)",
    content: [
      "Respectful Interaction: Ollypedia is a community dedicated to celebrating Odia cinema. We prohibit abusive language, harassment, hate speech, defamation, religious/caste-based discrimination, and spam.",
      "Ollypedia Meter & Voting Integrity: Users may cast votes (Skip, Timepass, Go for it, Perfection) on movies. Automated script voting, bot manipulation, or creating multiple accounts to artificially inflate or deflate ratings is strictly prohibited and subject to account banning.",
      "Content Ownership & License: By posting comments, reviews, or discussion threads, you grant Ollypedia a non-exclusive, royalty-free, perpetual license to display and distribute your content across our platform.",
      "Moderation & Removal: We reserve the right to moderate, sanitize, or remove any user-generated content and suspend or terminate accounts that violate our community standards without prior notice.",
    ],
  },
  {
    id: "content-use",
    icon: FileText,
    title: "4. Use of Website Content",
    content: [
      "All encyclopedic content on Ollypedia — including movie filmographies, cast/crew profiles, box office tracking, song listings, editorial articles, and reviews — is provided for informational and entertainment purposes.",
      "You may read, share, and link to Ollypedia pages for personal, non-commercial use. Automated scraping, bulk crawling without caching, or unauthorized commercial reproduction of our database is strictly prohibited.",
      "Movie posters, logos, and promotional media displayed on this site remain the property of their respective studios, distributors, and copyright holders, used here under fair use for encyclopedic reference.",
    ],
  },
  {
    id: "intellectual-property",
    icon: Scale,
    title: "5. Intellectual Property",
    content: [
      "The Ollypedia brand name, logo, site architecture, and original editorial articles are the intellectual property of Ollypedia.",
      "Factual information about Odia films (such as titles, release dates, box office collections, and cast lists) is factual reference. Reviews and editorial articles are original works authored by Ollypedia.",
      "If you believe any content on Ollypedia infringes your intellectual property or copyright, please contact us with details and we will take prompt corrective action.",
    ],
  },
  {
    id: "accuracy",
    icon: AlertCircle,
    title: "6. Accuracy & Disclaimers",
    content: [
      "Ollypedia strives for accurate, up-to-date cinema and box office data. However, historical records, trade estimates, and rapidly evolving industry data may occasionally contain inaccuracies.",
      "Box office figures, ratings, and verdicts are based on trade estimates, distributor reports, and editorial assessments. They should not be considered as official financial advice.",
      "Ollypedia contains links to third-party streaming platforms (AAO NXT, Tarang Plus, YouTube, etc.) and external resources. We are not responsible for third-party content, pricing, or streaming availability.",
    ],
  },
  {
    id: "termination",
    icon: AlertCircle,
    title: "7. Account Termination & Suspension",
    content: [
      "We reserve the right to suspend or permanently terminate user accounts that engage in harassment, spamming, vote manipulation, or attempts to exploit website vulnerabilities.",
      "You may request to deactivate or delete your account at any time by contacting our support team.",
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "8. Contact Us",
    content: [
      "If you have any questions, concerns, or requests regarding these Terms and Conditions or our Community Guidelines, please reach out to our team. We are happy to help.",
    ],
    cta: true,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TermsAndConditionsPage() {
  const lastUpdated = "May 3, 2025";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Terms & Conditions - Ollypedia",
    "description": "Read the Terms and Conditions for using Ollypedia, the most complete online encyclopedia for Odia movies.",
    "url": `${SITE_URL}/terms-and-conditions`,
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
      <main className="bg-[#0a0a0a] min-h-screen text-white">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-[#1c1c1c]">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(249,115,22,0.10) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16 relative">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
            <ol className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
              <li>
                <Link href="/" className="hover:text-orange-400 transition-colors flex items-center gap-1">
                  <Film className="w-3 h-3" aria-hidden="true" />
                  Ollypedia
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="w-3 h-3 text-gray-700" />
              </li>
              <li className="text-gray-500">Terms &amp; Conditions</li>
            </ol>
          </nav>

          {/* Title block */}
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl flex items-center justify-center mt-1"
              style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.20)" }}
              aria-hidden="true"
            >
              <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-orange-500 mb-2">
                Legal
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                Terms &amp; Conditions
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                Last updated: <time dateTime="2025-01-01">{lastUpdated}</time>
              </p>
            </div>
          </div>

          {/* Summary banner — community & safety highlight */}
          <div
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl px-4 py-3.5 sm:px-5 sm:py-4"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.15)",
            }}
            role="note"
            aria-label="Community & Security highlight"
          >
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <Shield className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
              </div>
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                Safe &amp; Transparent
              </span>
            </div>
            <p className="text-gray-400 text-[13px] leading-relaxed sm:ml-1">
              <strong className="text-gray-300 font-medium">Your privacy and account security matter.</strong>{" "}
              We encrypt user credentials, never sell personal data, and maintain fair, respectful community discussions for all Odia cinema lovers.
            </p>
          </div>
        </div>
      </div>

      {/* ── Table of Contents (sticky sidebar on large screens) ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">

          {/* Sidebar TOC */}
          <aside
            className="lg:w-52 xl:w-60 flex-shrink-0"
            aria-label="Table of contents"
          >
            <div className="lg:sticky lg:top-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-3">
                Contents
              </p>
              <nav>
                <ol className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="group flex items-center gap-2 text-[12px] text-gray-600 hover:text-orange-400 transition-colors py-1"
                      >
                        <span
                          className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-orange-500 transition-colors flex-shrink-0"
                          aria-hidden="true"
                        />
                        {s.title.replace(/^\d+\.\s/, "")}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              {/* Quick links */}
              <div className="mt-8 pt-6 border-t border-[#1c1c1c] space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 mb-2">
                  Also read
                </p>
                <Link
                  href="/privacy"
                  className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-orange-400 transition-colors"
                >
                  <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                  Privacy Policy
                </Link>
                <Link
                  href="/disclaimer"
                  className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-orange-400 transition-colors"
                >
                  <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                  Disclaimer
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <article
            className="flex-1 min-w-0"
            itemScope
            itemType="https://schema.org/WebPage"
          >
            <meta itemProp="name" content="Terms and Conditions — Ollypedia" />
            <meta
              itemProp="description"
              content="Terms and Conditions for Ollypedia, the Odia cinema encyclopedia. No personal data is collected from users."
            />

            <div className="space-y-10 sm:space-y-12">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: section.highlight
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(249,115,22,0.08)",
                          border: section.highlight
                            ? "1px solid rgba(34,197,94,0.15)"
                            : "1px solid rgba(249,115,22,0.12)",
                        }}
                        aria-hidden="true"
                      >
                        <Icon
                          className={`w-3.5 h-3.5 ${section.highlight ? "text-green-400" : "text-orange-400"}`}
                        />
                      </div>
                      <h2
                        id={`heading-${section.id}`}
                        className="text-base sm:text-lg font-semibold text-white"
                      >
                        {section.title}
                      </h2>
                    </div>

                    {/* Divider */}
                    <div
                      className="h-px mb-5"
                      style={{ background: "linear-gradient(to right, #1c1c1c 0%, transparent 100%)" }}
                      aria-hidden="true"
                    />

                    {/* Paragraphs */}
                    <div className="space-y-3.5">
                      {section.content.map((para, idx) => (
                        <p
                          key={idx}
                          className="text-[13px] sm:text-sm text-gray-500 leading-relaxed"
                        >
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* CTA for contact section */}
                    {section.cta && (
                      <div className="mt-5">
                        <Link
                          href="/contact"
                          className="inline-flex items-center gap-2 text-[13px] font-medium text-orange-400 hover:text-orange-300 border border-orange-500/25 hover:border-orange-400/50 bg-orange-500/8 hover:bg-orange-500/12 px-4 py-2 rounded-lg transition-all duration-200"
                        >
                          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                          Contact Us
                        </Link>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {/* Bottom note */}
            <div
              className="mt-12 sm:mt-14 rounded-xl px-5 py-4"
              style={{ background: "#111", border: "1px solid #1c1c1c" }}
            >
              <p className="text-[12px] text-gray-600 leading-relaxed">
                These Terms &amp; Conditions govern your use of{" "}
                <strong className="text-gray-500">Ollypedia</strong> and constitute the entire
                agreement between you and Ollypedia regarding your use of this website. By using
                Ollypedia you acknowledge that you have read, understood, and agree to be bound by
                these terms.
              </p>
              <p className="text-[11px] text-gray-700 mt-2">
                Last updated: <time dateTime="2025-01-01">{lastUpdated}</time> &nbsp;·&nbsp; Ollypedia,
                Odisha, India
              </p>
            </div>
          </article>
        </div>
      </div>

    </main>
    </>
  );
}