"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function BlogCategoryDropdown({ currentCategory, categories }: { currentCategory: string, categories: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {/* Full screen loading overlay for navigation */}
      {isPending && (
        <div className="fixed inset-0 z-[99999] bg-[#050505]/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-[spin_1s_ease-in-out_infinite]" />
              <div className="absolute w-8 h-8 border-4 border-orange-500/10 border-b-orange-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
            </div>
            <p className="text-orange-400 font-medium tracking-widest uppercase text-sm animate-pulse">
              Loading...
            </p>
          </div>
        </div>
      )}
      
      <div className="relative w-full sm:w-64">
        <select
          value={currentCategory}
          onChange={(e) => {
            startTransition(() => {
              if (e.target.value === "All") {
                router.push("/blog");
              } else {
                router.push(`/blog?category=${encodeURIComponent(e.target.value)}`);
              }
            });
          }}
          className="w-full appearance-none bg-[#111] border border-[#2a2a2a] text-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-sm cursor-pointer shadow-sm hover:border-gray-600"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
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
