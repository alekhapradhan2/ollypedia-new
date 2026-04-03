import Link from "next/link";
import { Film, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <p className="font-display text-[120px] font-black text-[#1a1a1a] leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-16 h-16 text-orange-500/40" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link href="/movies" className="btn-outline flex items-center justify-center gap-2">
            <Film className="w-4 h-4" /> Browse Movies
          </Link>
        </div>
      </div>
    </div>
  );
}
