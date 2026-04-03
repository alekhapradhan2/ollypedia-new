import Link from "next/link";
import { Film, Instagram, Twitter, Youtube } from "lucide-react";

const LINKS = {
  Explore: [
    { label: "Movies",      href: "/movies" },
    { label: "Songs",       href: "/songs" },
    { label: "Cast & Crew", href: "/cast" },
    { label: "News",        href: "/news" },
    { label: "Blog",        href: "/blog" },
  ],
  Company: [
    { label: "About Us",    href: "/about" },
    { label: "Contact",     href: "/contact" },
    { label: "Privacy",     href: "/privacy" },
    { label: "Disclaimer",  href: "/disclaimer" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#0d0d0d] border-t border-[#1a1a1a] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Olly<span className="text-orange-500">pedia</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Ollypedia is the most comprehensive encyclopedia of Odia (Ollywood) cinema — 
              covering movies, songs, actors, box office, and news from Odisha's vibrant film industry.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a1a1a] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Ollypedia. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            Celebrating the richness of Odia cinema 🎬
          </p>
        </div>
      </div>
    </footer>
  );
}
