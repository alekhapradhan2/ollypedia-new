"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-orange-500">Something went wrong</h2>
          <p className="text-gray-400 text-sm">{error.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
