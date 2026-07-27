"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function YearDropdown({ currentYear, validYears }: { currentYear: number, validYears: number[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {/* Full screen loading overlay for navigation */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
          <p className="text-orange-400 font-medium tracking-widest uppercase text-sm animate-pulse">Loading {currentYear}...</p>
        </div>
      )}
      
      <div className="relative w-48 sm:w-64">
        <select
          value={currentYear}
          onChange={(e) => {
            startTransition(() => {
              router.push(`/movies/year/${e.target.value}`);
            });
          }}
          className="w-full appearance-none bg-[#111] border border-[#2a2a2a] text-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-sm cursor-pointer shadow-sm hover:border-gray-600"
        >
          {validYears.map((yr) => (
            <option key={yr} value={yr}>{yr} Releases</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
          </svg>
        </div>
      </div>
    </>
  );
}
