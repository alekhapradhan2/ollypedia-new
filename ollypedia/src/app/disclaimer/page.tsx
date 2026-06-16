import type { Metadata } from "next";
import Link from "next/link";
import {
  Info,
  ShieldAlert,
  BarChart3,
  MessageSquare,
  Copyright,
  Youtube,
  Link2,
  Megaphone,
  ShieldQuestion,
  Scale,
  RefreshCw,
  Gavel,
  Mail,
} from "lucide-react";
import { buildMeta } from "@/lib/seo";

export const metadata: Metadata = buildMeta({
  title: "Disclaimer – Ollypedia",
  description: "Read Ollypedia's disclaimer regarding content accuracy, box office data, copyright, and external links.",
  url: "/disclaimer",
});

// ── Section content ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "general",
    icon: Info,
    title: "General Information",
    body: [
      "The information provided on Ollypedia is for general informational and entertainment purposes only. We are an independent encyclopedia covering Odia cinema and are not affiliated with any production house, studio, or distributor unless explicitly stated.",
      "While we strive to keep information accurate and up to date, we make no representations or warranties of any kind, express or implied, about the completeness, reliability, or accuracy of any content on this website.",
    ],
  },
  {
    id: "accuracy",
    icon: ShieldAlert,
    title: "Content Accuracy",
    body: [
      "Box office figures, release dates, cast and crew details, and other movie-related information are sourced from publicly available data, industry reports, and our own research. Given the nature of unofficial box office tracking, this information may not always be 100% accurate or fully up to date.",
      "We encourage users who notice errors or outdated information to let us know through our contact page so we can review and correct it.",
    ],
  },
  {
    id: "box-office",
    icon: BarChart3,
    title: "Box Office Data",
    body: [
      "All box office figures published on Ollypedia are compiled from publicly available industry sources and our independent research. These figures are estimates and may differ — sometimes significantly — from official numbers disclosed by producers, distributors, or production houses.",
      "Ollypedia updates collection data progressively as new figures become available, which means numbers shown for recent releases may change over time as more reports come in.",
    ],
    callout: {
      tone: "amber",
      text: (
        <>
          Box office data is approximate and unofficial. <strong className="text-amber-300">Ollypedia</strong> makes
          no claims about the authenticity of these figures and accepts no liability for decisions made based on
          them.
        </>
      ),
    },
  },
  {
    id: "user-content",
    icon: MessageSquare,
    title: "User-Generated Content & Reviews",
    body: [
      "Reviews, ratings, and comments submitted by users represent the personal opinions of those individuals and do not reflect the views of Ollypedia. We do not verify, endorse, or take responsibility for the accuracy of user-submitted content.",
      "We reserve the right to moderate, edit, or remove any user-submitted content that violates our community standards or applicable law, without prior notice.",
    ],
  },
  {
    id: "copyright",
    icon: Copyright,
    title: "Copyright & Intellectual Property",
    body: [
      "All movie posters, stills, trailers, songs, and promotional artwork featured on Ollypedia are the property of their respective copyright holders — including production houses, music labels, and distributors. We use such material under fair use for the purposes of commentary, criticism, news reporting, and education.",
      "If you are a copyright owner and believe content on Ollypedia has been used inappropriately, please contact us at hello@ollypedia.in and we will review and respond promptly.",
    ],
  },
  {
    id: "youtube",
    icon: Youtube,
    title: "YouTube Embedded Videos",
    body: [
      "Ollypedia embeds publicly available YouTube videos for movie trailers and songs. These videos remain hosted on YouTube and are subject to YouTube's own Terms of Service and Community Guidelines.",
      "We are not responsible for the availability, content, or removal of embedded videos, as these are controlled entirely by YouTube and the respective content owners.",
    ],
  },
  {
    id: "external-links",
    icon: Link2,
    title: "External Links",
    body: [
      "Our website may contain links to external websites for your convenience — such as ticketing platforms, news sources, or official studio pages. These links do not imply endorsement, and we have no control over, and accept no responsibility for, the content, accuracy, or practices of linked third-party sites.",
    ],
  },
  {
    id: "advertising",
    icon: Megaphone,
    title: "Advertising",
    body: [
      "Ollypedia may display advertisements through Google AdSense and other third-party advertising networks. These networks may use cookies to serve ads based on your prior visits to this and other websites.",
      "The presence of an advertisement on Ollypedia does not constitute an endorsement of the advertiser, its products, or its services by Ollypedia.",
    ],
  },
  {
    id: "no-advice",
    icon: ShieldQuestion,
    title: "No Professional or Financial Advice",
    body: [
      "Nothing on Ollypedia, including box office figures, verdicts, or trend analysis, should be construed as financial, investment, or professional advice of any kind. Any reliance you place on such information is strictly at your own risk.",
    ],
  },
  {
    id: "liability",
    icon: Scale,
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Ollypedia and its operators shall not be liable for any direct, indirect, incidental, or consequential loss or damage arising from your use of, or reliance on, this website or its content.",
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "Changes to This Disclaimer",
    body: [
      "We may revise this disclaimer from time to time to reflect changes in our practices, content, or legal obligations. Any updates will be posted on this page with a revised \"last updated\" date, so we encourage you to review it periodically.",
    ],
  },
  {
    id: "governing-law",
    icon: Gavel,
    title: "Governing Law",
    body: [
      "This disclaimer is governed by and construed in accordance with the laws of India. Any disputes arising from the use of this website shall be subject to the exclusive jurisdiction of the courts of Odisha, India.",
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact",
    body: [],
  },
] as const;

const QUICK_LINKS = SECTIONS.filter((s) => s.id !== "contact").map((s) => ({
  id: s.id,
  label: s.title,
}));

export default function DisclaimerPage() {
  return (
    <main className="bg-black min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8 sm:mb-10">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500 mb-3 flex items-center gap-2">
            <span className="w-5 h-px bg-orange-500/60" aria-hidden="true" />
            Legal
          </h3>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white mb-3">
            Disclaimer
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
            Ollypedia is an independent Odia cinema encyclopedia. This page explains how we source our
            content, the limits of our box office data, and how copyright and third-party material are
            handled across the site.
          </p>
          <p className="text-gray-700 text-xs mt-4">Last updated: June 16, 2026</p>
        </div>

        {/* ── Quick nav ───────────────────────────────────────────────── */}
        <nav
          aria-label="Disclaimer sections"
          className="mb-10 sm:mb-12 p-4 sm:p-5 rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a]"
        >
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-3">
            Jump to a section
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-[11px] text-gray-500 hover:text-orange-400 border border-[#1e1e1e] hover:border-orange-500/30 px-2.5 py-1 rounded-full transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Sections ────────────────────────────────────────────────── */}
        <div className="space-y-5 sm:space-y-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a] p-5 sm:p-6 scroll-mt-6"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <h2 className="text-[15px] sm:text-base font-semibold text-gray-200">
                    {section.title}
                  </h2>
                </div>

                {section.body.map((para, i) => (
                  <p
                    key={i}
                    className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-2.5 last:mb-0"
                  >
                    {para}
                  </p>
                ))}

                {"callout" in section && section.callout && (
                  <div className="flex gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl mt-3">
                    <span className="text-amber-400 text-base flex-shrink-0">⚠️</span>
                    <p className="text-sm text-amber-300/80 leading-relaxed">
                      {section.callout.text}
                    </p>
                  </div>
                )}

                {section.id === "contact" && (
                  <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed">
                    For any questions regarding this disclaimer, please{" "}
                    <Link href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors">
                      contact us
                    </Link>{" "}
                    or email{" "}
                    <a
                      href="mailto:alekhpradhan3305@gmail.com"
                      className="text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      alekhpradhan3305@gmail.com
                    </a>
                    .
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {/* ── Related legal links ────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-[#1c1c1c] flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/privacy"
            className="text-gray-600 text-xs hover:text-orange-400 transition-colors"
          >
            Privacy Policy
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
  );
}