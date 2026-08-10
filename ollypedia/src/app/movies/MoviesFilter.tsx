"use client";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useTransition } from "react";


interface MoviesFilterProps {
  genres: string[];
  verdicts: string[];
  active: { genre?: string; verdict?: string; year?: string; sort?: string; page: number };
  totalPages: number;
}

export function MoviesFilter({ genres, verdicts, active, totalPages }: MoviesFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const years = Array.from({ length: new Date().getFullYear() - 1935 }, (_, i) => new Date().getFullYear() - i);

  function update(key: string, value: string | null) {
    if (key === "year" && value && value !== "All") {
      startTransition(() => {
        router.push(`/movies/year/${value}`);
      });
      return;
    }

    const params = new URLSearchParams();
    if (active.genre && key !== "genre") params.set("genre", active.genre);
    if (active.verdict && key !== "verdict") params.set("verdict", active.verdict);
    
    if (active.year && key !== "year") {
        params.set("year", active.year);
    }
    
    if (active.sort && key !== "sort") params.set("sort", active.sort);
    
    if (value && value !== "All") params.set(key, value);
    
    let baseUrl = "/movies";
    if (active.year && key !== "year") {
        baseUrl = `/movies/year/${active.year}`;
        params.delete("year");
    }

    startTransition(() => {
      router.push(`${baseUrl}?${params.toString()}`);
    });
  }

  const selectBase = "w-full appearance-none bg-[#111] border border-[#2a2a2a] text-gray-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-xs sm:text-sm cursor-pointer shadow-sm hover:border-gray-600";

  return (
    <>
      {/* Full screen loading overlay */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
          <p className="text-orange-400 font-medium tracking-widest uppercase text-sm animate-pulse">Loading...</p>
        </div>
      )}

      <div className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Genre */}
          <div className="relative">
            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium uppercase tracking-widest px-1">Genre</label>
            <div className="relative">
              <select
                value={active.genre || "All"}
                onChange={(e) => update("genre", e.target.value)}
                className={selectBase}
              >
                <option value="All">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div className="relative">
            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium uppercase tracking-widest px-1">Verdict</label>
            <div className="relative">
              <select
                value={active.verdict || "All"}
                onChange={(e) => update("verdict", e.target.value)}
                className={selectBase}
              >
                <option value="All">All Verdicts</option>
                {verdicts.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Year */}
          <div className="relative">
            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium uppercase tracking-widest px-1">Year</label>
            <div className="relative">
              <select
                value={active.year || "All"}
                onChange={(e) => update("year", e.target.value)}
                className={selectBase}
              >
                <option value="All">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="relative">
            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium uppercase tracking-widest px-1">Sort By</label>
            <div className="relative">
              <select
                value={active.sort || "latest"}
                onChange={(e) => update("sort", e.target.value)}
                className={selectBase}
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
