// src/app/privacy/page.tsx
// Privacy Policy page — fixes the 404 caused by Footer.tsx linking to /privacy
// with no corresponding route. Styled to match the dark theme used in Footer
// (bg-black, gray-5xx text, orange-500 accents).

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Ollypedia",
  description:
    "Read Ollypedia's Privacy Policy to learn how we collect, use, and protect your information while you browse Odisha's most complete Odia cinema encyclopedia.",
  alternates: {
    canonical: "https://www.ollypedia.in/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const SECTIONS = [
  {
    heading: "1. Introduction",
    body: `Ollypedia ("we", "us", or "our") operates ollypedia.in, an online encyclopedia for Odia cinema (Ollywood), covering movies, songs, cast and crew profiles, box office data, and industry news. This Privacy Policy explains how we collect, use, and safeguard information when you visit our website.`,
  },
  {
    heading: "2. Information We Collect",
    body: `We collect limited information to operate and improve Ollypedia:`,
    list: [
      "Usage data — pages visited, time spent, device and browser type, and approximate location, collected automatically via analytics tools.",
      "Cookies and similar technologies — used to remember preferences and understand site traffic.",
      "Voluntarily provided information — such as your name and email address if you contact us, leave a review, or comment on a movie or blog post.",
    ],
  },
  {
    heading: "3. How We Use Your Information",
    body: `Information we collect is used to:`,
    list: [
      "Operate, maintain, and improve the Ollypedia website and its content.",
      "Understand site traffic and user behaviour through analytics.",
      "Respond to inquiries submitted through our contact page.",
      "Display relevant advertising, where applicable, through third-party advertising networks.",
    ],
  },
  {
    heading: "4. Cookies",
    body: `Ollypedia uses cookies and similar tracking technologies to enhance your browsing experience. Cookies are small text files stored on your device. You can choose to disable cookies through your browser settings, though some site features may not function as intended without them.`,
  },
  {
    heading: "5. Third-Party Services",
    body: `We may use third-party services such as Google Analytics to understand site usage, and may in the future use advertising networks such as Google AdSense to display ads. These third parties may collect information through cookies and similar technologies in accordance with their own privacy policies. We do not control these third-party practices and encourage you to review their respective privacy policies.`,
  },
  {
    heading: "6. Data Security",
    body: `We take reasonable measures to protect the information we hold from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.`,
  },
  {
    heading: "7. Children's Privacy",
    body: `Ollypedia is intended for a general audience and is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can remove it.`,
  },
  {
    heading: "8. Your Choices",
    body: `You may disable cookies in your browser, opt out of personalized advertising through your ad settings on relevant platforms, and contact us at any time to ask questions about the information we hold about you.`,
  },
  {
    heading: "9. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Updates will be posted on this page with a revised effective date.`,
  },
  {
    heading: "10. Contact Us",
    body: `If you have questions about this Privacy Policy, please reach out through our Contact page.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
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
  );
}