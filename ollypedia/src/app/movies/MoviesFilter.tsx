"use client";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

interface MoviesFilterProps {
  genres: string[];
  verdicts: string[];
  active: { genre?: string; verdict?: string; sort?: string; page: number };
  totalPages: number;
}

export function MoviesFilter({ genres, verdicts, active, totalPages }: MoviesFilterProps) {
  const router = useRouter();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams();
    if (active.genre   && key !== "genre")   params.set("genre",   active.genre);
    if (active.verdict && key !== "verdict") params.set("verdict", active.verdict);
    if (active.sort    && key !== "sort")    params.set("sort",    active.sort);
    if (value) params.set(key, value);
    // Don't set page parameter as we are using infinite scroll
    router.push(`/movies?${params.toString()}`);
  }

  const pillBase = "px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer";
  const pillActive = "bg-orange-500/20 border-orange-500/50 text-orange-400";
  const pillIdle   = "bg-transparent border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-orange-400";

  return (
    <div className="mb-8 space-y-4">
      {/* Genre */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-widest">Genre</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => update("genre", null)}
            className={clsx(pillBase, !active.genre ? pillActive : pillIdle)}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => update("genre", active.genre === g ? null : g)}
              className={clsx(pillBase, active.genre === g ? pillActive : pillIdle)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Verdict */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-widest">Verdict</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => update("verdict", null)}
            className={clsx(pillBase, !active.verdict ? pillActive : pillIdle)}
          >
            All
          </button>
          {verdicts.map((v) => (
            <button
              key={v}
              onClick={() => update("verdict", active.verdict === v ? null : v)}
              className={clsx(pillBase, active.verdict === v ? pillActive : pillIdle)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Sort:</p>
        <select
          value={active.sort || "latest"}
          onChange={(e) => update("sort", e.target.value)}
          className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500/50"
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>
      </div>
    </div>
  );
}
