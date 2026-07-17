"use client";

import { useState } from "react";

export function PlatformLogo({ name, domain, slug, color, className = "" }: { name: string; domain?: string; slug?: string; color: string; className?: string }) {
  const [error, setError] = useState(false);

  if (error || !slug) {
    // Return a stylish text-based initial logo if image fails completely
    return (
      <div 
        className={`flex items-center justify-center rounded-full ${className}`}
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color: color }}
      >
        <span className="font-bold text-lg" style={{ color: color }}>
          {name.substring(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`/platforms/${slug}.png?v=3`}
      alt={`${name} Logo`}
      className={className}
      onError={() => setError(true)}
    />
  );
}
