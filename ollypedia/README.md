# Ollypedia – Odia Film Encyclopedia

A production-ready Next.js website for Odia (Ollywood) cinema, built with App Router, MongoDB, Tailwind CSS, and full SSR + SEO support.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local .env.local   # already created — update if needed

# 3. Seed the database with sample data
node scripts/seed.js

# 4. Start development server
npm run dev
```

Visit → http://localhost:3000

---

## Environment Variables (`.env.local`)

```
MONGODB_URI=mongodb+srv://...your connection string...
NEXT_PUBLIC_SITE_URL=https://www.ollypedia.in
NEXT_PUBLIC_SITE_NAME=Ollypedia
JWT_SECRET=your_secret_here
GROQ_API_KEY=your_groq_key_here   # optional, for AI article generation
```

---

## Project Structure

```
ollypedia/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Homepage (/)
│   │   ├── layout.tsx          # Root layout + metadata
│   │   ├── not-found.tsx       # 404 page
│   │   ├── movies/             # /movies listing + MoviesFilter.tsx
│   │   ├── movie/[slug]/       # /movie/[slug] detail page
│   │   ├── cast/               # /cast listing
│   │   ├── cast/[id]/          # /cast/[id] profile page
│   │   ├── blog/               # /blog listing
│   │   ├── blog/[slug]/        # /blog/[slug] article page
│   │   ├── songs/              # /songs page + SongsClient.tsx
│   │   ├── news/               # /news listing
│   │   ├── search/             # /search results
│   │   ├── about/              # /about page
│   │   ├── contact/            # /contact page with form
│   │   ├── privacy/            # /privacy policy
│   │   ├── disclaimer/         # /disclaimer
│   │   ├── sitemap.xml/        # Dynamic sitemap
│   │   ├── robots.txt/         # robots.txt
│   │   └── api/                # API routes
│   │       ├── movies/         # GET /api/movies, /api/movies/[id]
│   │       ├── movies/[id]/review/  # POST review
│   │       ├── cast/           # GET /api/cast, /api/cast/[id]
│   │       ├── blog/           # GET /api/blog, /api/blog/[slug]
│   │       ├── songs/          # GET /api/songs (with aggregation)
│   │       ├── news/           # GET /api/news
│   │       ├── search/         # GET /api/search?q=
│   │       ├── contact/        # POST /api/contact
│   │       └── vote/[id]/      # POST vote (yes/no)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx      # Sticky nav with search
│   │   │   └── Footer.tsx      # Footer with links
│   │   ├── ui/
│   │   │   ├── Breadcrumb.tsx  # SEO breadcrumb nav
│   │   │   ├── Skeleton.tsx    # Loading skeletons
│   │   │   ├── StarRating.tsx  # Star rating display
│   │   │   ├── SectionHeader.tsx # Section title + View All link
│   │   │   ├── YouTubeEmbed.tsx  # Lazy YouTube embed with thumbnail
│   │   │   └── VoteButtons.tsx   # Interest voting (yes/no)
│   │   ├── movie/
│   │   │   ├── MovieCard.tsx   # Portrait/landscape movie card
│   │   │   └── ReviewForm.tsx  # User review submission form
│   │   ├── cast/
│   │   │   └── CastCard.tsx    # Cast member card
│   │   ├── blog/
│   │   │   └── BlogCard.tsx    # Blog article card
│   │   └── songs/
│   │       └── SongCard.tsx    # Song list card
│   ├── lib/
│   │   ├── db.ts               # MongoDB connection (cached)
│   │   └── seo.ts              # Metadata + JSON-LD generators
│   ├── models/
│   │   ├── Movie.ts            # Movie mongoose model
│   │   ├── Cast.ts             # Cast mongoose model
│   │   ├── Blog.ts             # Blog mongoose model
│   │   ├── News.ts             # News mongoose model
│   │   └── Contact.ts          # Contact form model
│   └── styles/
│       └── globals.css         # Tailwind + custom CSS
├── public/
│   ├── placeholder-movie.svg
│   ├── placeholder-person.svg
│   ├── placeholder-blog.svg
│   └── placeholder-song.svg
├── scripts/
│   └── seed.js                 # Database seeder with sample data
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── .env.local
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, latest movies, blogs, news |
| `/movies` | Movie listing with genre/verdict filters + pagination |
| `/movie/[slug]` | Full movie detail: trailer, cast, songs, reviews, box office |
| `/cast` | Cast directory with role filter |
| `/cast/[id]` | Actor/actress profile with biography and filmography |
| `/blog` | Blog listing with category filter |
| `/blog/[slug]` | Full blog article with related posts |
| `/songs` | Songs database with singer/director filters + YouTube modal |
| `/news` | Latest Ollywood news |
| `/search` | Full-text search across movies, cast, blogs |
| `/about` | About Ollypedia |
| `/contact` | Contact form |
| `/privacy` | Privacy policy |
| `/disclaimer` | Legal disclaimer |
| `/sitemap.xml` | Auto-generated XML sitemap |
| `/robots.txt` | Search engine robots directive |

---

## SEO Features

- **Dynamic Metadata** — `generateMetadata()` on every page
- **Open Graph tags** — title, description, image for social sharing  
- **JSON-LD Structured Data** — Movie, Article, Person, BreadcrumbList schemas
- **Canonical URLs** — prevents duplicate content indexing
- **Auto sitemap** — XML sitemap covering all movies, cast, blogs
- **Robots.txt** — proper crawl directives
- **Breadcrumbs** — navigation + schema markup
- **SSR** — all pages server-rendered for Google indexing
- **Rich content** — 500–1000+ word articles, reviews, and stories per movie

---

## AdSense Readiness

To prepare for Google AdSense approval:

1. **Add real content** — run the seed script, then add more movies through your existing Express backend
2. **Add AdSense script** in `src/app/layout.tsx`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>
   ```
3. **Place ad units** in movie detail pages and blog posts (high dwell-time pages)
4. **Ensure content quality** — each movie page needs a full synopsis + review

---

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel Dashboard:
- `MONGODB_URI`
- `JWT_SECRET`  
- `GROQ_API_KEY` (optional)

The `NEXT_PUBLIC_*` variables are already in `vercel.json`.

---

## Connecting to Your Existing Express Backend

The Express `server.js` can run alongside this Next.js frontend:

- Deploy Express to **Render** or **Railway**
- Update your existing admin portal to point to the same MongoDB Atlas database
- Next.js reads directly from MongoDB — no need to proxy through Express for public pages
- Use Express backend for admin operations (movie creation, cast management, etc.)

---

## Adding Content

### Via Express Admin (recommended)
Use your existing Express backend admin portal to add movies, cast members, blogs, and news. The Next.js site reads from the same MongoDB database.

### Via MongoDB Atlas
Directly insert documents following the schema in `src/models/`.

### Via Seed Script
```bash
node scripts/seed.js
```

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom dark cinema theme
- **Database**: MongoDB Atlas + Mongoose
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Icons**: Lucide React
- **Toasts**: React Hot Toast
- **Deployment**: Vercel

---

Built with ❤️ for Odia cinema.
