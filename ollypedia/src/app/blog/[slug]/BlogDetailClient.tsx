"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BlogDetailClient({ slug }: { slug: string }) {
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/blog/${slug}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        setPost(data);

        const rel = await fetch(`${API_BASE}/blog?limit=4`, {
          cache: "no-store",
        });
        const relData = await rel.json();
        setRelated(
          (relData.posts || []).filter((p: any) => p.slug !== slug)
        );
      } catch (e) {
        console.log(e);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  if (!post) {
    return <div className="text-white p-10">Not Found</div>;
  }

  return (
    <div className="bg-black text-white min-h-screen">

      {/* 🔥 Banner */}
      {post.coverImage && (
        <div className="relative h-[420px]">
          <img
            src={post.coverImage}
            className="w-full h-full object-cover brightness-50"
          />

          <div className="absolute bottom-0 p-6 max-w-3xl">
            <button
              onClick={() => router.push("/blog")}
              className="text-sm text-gray-300 mb-3"
            >
              ← Back
            </button>

            <div className="text-xs uppercase text-orange-400 mb-2">
              {post.category}
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              {post.title}
            </h1>

            <div className="text-sm text-gray-400 mt-2">
              {post.author} •{" "}
              {new Date(post.createdAt).toLocaleDateString("en-IN")} •{" "}
              {post.readTime || 5} min read
            </div>
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 p-6">

        {/* 📝 ARTICLE */}
        <div className="md:col-span-2">

          <div className="article">
            {post.content.split("\n\n").map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {post.tags?.map((t: string) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* 📊 SIDEBAR */}
        <aside className="space-y-6">

          {/* Share */}
          <div className="box">
            <h3>Share</h3>
            <button
              className="share-btn"
              onClick={() => setShowShare(true)}
            >
              🔗 Share Article
            </button>
          </div>

          {/* Related */}
          <div className="box">
            <h3>Related</h3>
            {related.map((r) => (
              <div
                key={r._id}
                className="rel"
                onClick={() => router.push(`/blog/${r.slug}`)}
              >
                {r.title}
              </div>
            ))}
          </div>

        </aside>
      </div>

      {/* 🔥 SHARE MODAL */}
      {showShare && (
        <div className="overlay" onClick={() => setShowShare(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share this article</h3>

            <button
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?url=${window.location.href}`
                )
              }
            >
              Twitter
            </button>

            <button
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`
                )
              }
            >
              Facebook
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Copied!");
              }}
            >
              Copy Link
            </button>

            <button onClick={() => setShowShare(false)}>Close</button>
          </div>
        </div>
      )}

      {/* 🎨 STYLES */}
      <style jsx>{`
        .article p {
          margin-bottom: 1.5rem;
          line-height: 1.9;
          color: rgba(255,255,255,0.8);
        }

        .article p:first-child::first-letter {
          font-size: 4rem;
          float: left;
          margin-right: 10px;
          font-weight: bold;
          color: #c9973a;
        }

        .tag {
          background: #222;
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
        }

        .box {
          border: 1px solid #333;
          padding: 15px;
        }

        .rel {
          cursor: pointer;
          padding: 8px 0;
        }

        .share-btn {
          width: 100%;
          padding: 10px;
          background: #222;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal {
          background: #111;
          padding: 20px;
          width: 300px;
        }

        .modal button {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 10px;
          background: #222;
        }
      `}</style>
    </div>
  );
}