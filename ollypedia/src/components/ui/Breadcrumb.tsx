import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
      <Link href="/" className="hover:text-orange-400 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-orange-400 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-300">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
