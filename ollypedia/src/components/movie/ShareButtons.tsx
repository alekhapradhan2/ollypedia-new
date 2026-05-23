"use client";
// components/movie/ShareButtons.tsx
// WhatsApp + X/Twitter + Copy link share bar.
// Usage: <ShareButtons title="Movie Name (2025) – Odia Movie" url={canonical} />

import { useState } from "react";

interface Props {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  const twitter  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex gap-2 flex-wrap mt-3" aria-label="Share this movie">

      {/* WhatsApp */}
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1f1f1f] bg-[#111] hover:border-green-500/40 hover:text-green-400 text-gray-400 text-xs font-semibold transition-all"
      >
        {/* WhatsApp icon */}
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.555 4.103 1.523 5.825L0 24l6.34-1.507A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.375l-.36-.213-3.72.885.926-3.617-.235-.372A9.818 9.818 0 0112 2.182c5.422 0 9.818 4.396 9.818 9.818 0 5.423-4.396 9.818-9.818 9.818z"/>
        </svg>
        WhatsApp
      </a>

      {/* X / Twitter */}
      <a
        href={twitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1f1f1f] bg-[#111] hover:border-sky-500/40 hover:text-sky-400 text-gray-400 text-xs font-semibold transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X
      </a>

      {/* Facebook */}
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1f1f1f] bg-[#111] hover:border-blue-500/40 hover:text-blue-400 text-gray-400 text-xs font-semibold transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0" aria-hidden="true">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
        Facebook
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          copied
            ? "border-green-500/40 text-green-400 bg-green-500/8"
            : "border-[#1f1f1f] bg-[#111] hover:border-orange-500/40 hover:text-orange-400 text-gray-400"
        }`}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copy link
          </>
        )}
      </button>

    </div>
  );
}
