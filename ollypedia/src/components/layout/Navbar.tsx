"use client";
// components/Navbar.tsx  —  UPDATED (box-office link added, nothing removed)
// Only change from original: "Box Office" added to NAV_LINKS array.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, Film } from "lucide-react";
import clsx from "clsx";

const NAV_LINKS = [
  { label: "Movies",     href: "/movies"     },
  { label: "Songs",      href: "/songs"       },
  { label: "Cast",       href: "/cast"        },
  { label: "Box Office", href: "/box-office"  }, // ← NEW
  { label: "News",       href: "/news"        },
  { label: "Blog",       href: "/blog"        },
];

export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [search, setSearch] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearch(false);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-wide">
              Olly<span className="text-orange-500">pedia</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname?.startsWith(link.href)
                    ? "text-orange-400 bg-orange-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {search ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search movies, actors…"
                  className="w-52 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                />
                <button
                  type="button"
                  onClick={() => setSearch(false)}
                  className="p-1.5 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearch(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {open && (
          <div className="md:hidden pb-4 border-t border-[#1f1f1f] pt-3">
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button type="submit" className="px-3 py-2 bg-orange-500 rounded-lg text-white text-sm">
                Go
              </button>
            </form>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "block px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors",
                  pathname?.startsWith(link.href)
                    ? "text-orange-400 bg-orange-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}