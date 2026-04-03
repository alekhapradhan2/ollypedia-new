/**
 * Ollypedia Seed Script
 * Usage: node scripts/seed.js
 * Creates sample Odia movies, cast, blogs and news in MongoDB.
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("MONGODB_URI not set in .env.local"); process.exit(1); }

// ── Inline schemas ──────────────────────────────────────────────────────────
const CastSchema = new mongoose.Schema(
  { name: String, type: String, roles: [String], bio: String, photo: String,
    dob: String, gender: String, location: String },
  { timestamps: true }
);
const MovieSchema = new mongoose.Schema(
  { title: String, category: { type: String, default: "Feature Film" },
    genre: [String], releaseDate: String, director: String, producer: String,
    budget: String, language: { type: String, default: "Odia" },
    synopsis: String, story: String, review: String,
    posterUrl: String, thumbnailUrl: String, bannerUrl: String,
    runtime: String, imdbRating: String, contentRating: String,
    productionId: mongoose.Schema.Types.ObjectId,
    cast: [{ castId: mongoose.Schema.Types.ObjectId, name: String,
              photo: String, type: String, role: String }],
    media: {
      trailer: { ytId: String, url: String },
      songs: [{ title: String, singer: String, musicDirector: String,
                lyricist: String, ytId: String, thumbnailUrl: String, lyrics: String }],
    },
    boxOffice: { opening: String, firstWeek: String, total: String },
    verdict: String, status: String, slug: String,
    interestedYes: { type: Number, default: 0 },
    interestedNo:  { type: Number, default: 0 } },
  { timestamps: true }
);
const BlogSchema = new mongoose.Schema(
  { title: String, slug: String, excerpt: String, content: String,
    category: String, tags: [String], coverImage: String,
    author: String, published: Boolean, featured: Boolean,
    views: Number, readTime: Number, seoTitle: String, seoDesc: String },
  { timestamps: true }
);
const NewsSchema = new mongoose.Schema(
  { movieTitle: String, title: String, content: String,
    category: String, imageUrl: String, published: Boolean, newsType: String },
  { timestamps: true }
);

const Cast  = mongoose.model("Cast",  CastSchema);
const Movie = mongoose.model("Movie", MovieSchema);
const Blog  = mongoose.model("Blog",  BlogSchema);
const News  = mongoose.model("News",  NewsSchema);

function makeSlug(title, date) {
  const year = date ? new Date(date).getFullYear() : "";
  const base = String(title).toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"-").trim();
  return year ? `${base}-${year}` : base;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const prodId = new mongoose.Types.ObjectId();

  // ── Cast ──────────────────────────────────────────────────────
  const castSeed = [
    { name: "Babushaan Mohanty", type: "Actor",   roles: ["Actor"],
      gender: "Male", location: "Bhubaneswar, Odisha",
      bio: "Babushaan Mohanty is one of the most celebrated actors in Odia cinema (Ollywood). Born on December 18, 1987, in Bhubaneswar, he is the son of legendary comedian Mihir Das. He made his debut with Tu Mo Love Story (2009) and delivered a career-best performance in Daman (2022). Known for versatile roles spanning romance, action and social drama, Babushaan has become the face of modern Ollywood. His performances consistently bring emotional depth and authenticity, earning him a massive fanbase across Odisha and the Odia diaspora worldwide." },
    { name: "Elina Samantray",   type: "Actress", roles: ["Actress"],
      gender: "Female", location: "Odisha",
      bio: "Elina Samantray is one of the most popular and accomplished actresses in Odia cinema. Known for her expressive eyes and naturalistic acting style, she has delivered powerful performances across a range of genres — from romantic dramas to social films. Her nuanced portrayal of complex female characters has set a new standard for women's roles in Ollywood. She is widely regarded as the leading actress of her generation in Odia cinema and continues to be one of the most sought-after stars in the industry." },
    { name: "Sabyasachi Mishra", type: "Actor",   roles: ["Actor"],
      gender: "Male", location: "Odisha",
      bio: "Sabyasachi Mishra is a highly respected and versatile actor in Odia cinema with a career spanning over two decades. Known for his powerful dialogue delivery, intense screen presence, and ability to inhabit vastly different characters, he has played romantic heroes, complex anti-heroes, and fearsome villains with equal conviction. His contributions to Odia cinema have earned him multiple awards and a devoted fanbase that spans generations of Odia film lovers." },
    { name: "Barsha Priyadarshini", type: "Actress", roles: ["Actress"],
      gender: "Female", location: "Odisha",
      bio: "Barsha Priyadarshini is one of the brightest and most talented stars of contemporary Odia cinema. She made an immediate impact with her debut performances and quickly established herself as one of Ollywood's premier actresses. Acclaimed for her natural talent, expressive performances, and remarkable screen presence, Barsha has been part of several major Odia film productions and continues to take on roles that challenge and showcase her considerable abilities." },
  ];

  const castDocs = [];
  for (const c of castSeed) {
    let doc = await Cast.findOne({ name: c.name });
    if (!doc) { doc = await Cast.create(c); console.log("  Cast created:", c.name); }
    else console.log("  Cast exists:", c.name);
    castDocs.push(doc);
  }

  // ── Movies ────────────────────────────────────────────────────
  const moviesSeed = [
    {
      title: "Daman", releaseDate: "2022-11-11", genre: ["Action","Drama","Social"],
      director: "Saurav Dash", producer: "Sidharth TV", runtime: "152 min",
      language: "Odia", contentRating: "U/A", verdict: "Blockbuster", status: "Released",
      imdbRating: "8.2",
      synopsis: "A village development officer fights against corruption and social injustice to transform the lives of tribals in rural Odisha.",
      story: "<p>Daman is set in the tribal heartlands of Odisha, where Abhinav Mishra — played with extraordinary conviction by Babushaan Mohanty — arrives as a newly posted Block Development Officer full of idealism and a genuine desire to serve the people. The film opens with Abhinav's transfer to Narayanpur, a remote block plagued by poverty, malnutrition, and a deeply entrenched web of corruption involving local politicians, contractors, and complicit bureaucrats.</p><p>As Abhinav begins his work, he quickly discovers that the system is stacked against honest officers at every turn. The local MLA, backed by criminal elements and protected by political connections reaching far up the chain of power, has been siphoning government funds meant for tribal welfare for years. Every project Abhinav initiates is sabotaged from within — contractors submit inflated bills, fellow officials take bribes, and villagers live in genuine fear of speaking up against the powerful.</p><p>The emotional core of the film is Abhinav's relationship with the tribal community, particularly an elderly village elder whose quiet dignity and moral clarity become Abhinav's compass in moments of doubt. Through their interactions, the film beautifully portrays the rich cultural heritage and the quiet resilience of Odisha's tribal people — their traditions, their relationship with the land, their sense of community.</p><p>Daman's climax — an extended, tense confrontation between Abhinav's forces of legitimate authority and the criminal network that has long operated with impunity — is masterfully staged by director Saurav Dash. The film ultimately delivers a message of hope: that one committed, honest individual, armed with courage and conviction, can challenge and ultimately overcome even deeply entrenched corruption.</p>",
      review: "<p>Daman is a remarkable achievement for Odia cinema — a film that combines commercial entertainment with a powerful social message without compromising on either. Director Saurav Dash has crafted a tightly paced narrative that never loses its human touch even as it delivers on the action and drama fronts. The film's greatest achievement is making its social themes feel urgent and personal rather than didactic.</p><p>Babushaan Mohanty delivers one of the finest performances of his career. His portrayal of Abhinav Mishra is nuanced and layered — equal parts idealistic, vulnerable, and fierce when the situation demands it. The actor's commitment to authenticity, including extensive preparation and research, is evident in every frame. The supporting cast, particularly the actors playing tribal villagers, bring an authenticity that grounds the film in lived reality.</p><p>The cinematography is stunning, capturing the raw beauty of tribal Odisha's forests, hills, and villages with an eye for both grandeur and intimate human detail. The music perfectly complements the film's emotional arcs. Daman is essential viewing for anyone interested in Odia cinema or in the power of cinema to inspire social consciousness. Rating: 8.5/10.</p>",
      boxOffice: { opening: "₹1.8 Cr", firstWeek: "₹9 Cr", total: "₹25+ Cr" },
      media: {
        trailer: { ytId: "mTTT3QSoKXI" },
        songs: [
          { title: "Mo Odia Maa", singer: "Swayam Padhi", musicDirector: "Prem Anand" },
          { title: "Tike Thare Thare", singer: "Human Sagar", musicDirector: "Prem Anand" },
          { title: "Bande Utakala Janani", singer: "Asima Panda", musicDirector: "Prem Anand" },
        ],
      },
      cast: [{ castId: castDocs[0]._id, name: "Babushaan Mohanty", type: "Actor", role: "Abhinav Mishra (Lead)" }],
      interestedYes: 342, interestedNo: 18,
    },
    {
      title: "Laxmi", releaseDate: "2023-02-10", genre: ["Drama","Social","Family"],
      director: "Suneel Mohanty", runtime: "145 min",
      language: "Odia", contentRating: "U", verdict: "Hit", status: "Released",
      imdbRating: "7.9",
      synopsis: "A heartwarming social drama about a young woman's journey to overcome poverty, discrimination, and societal barriers to achieve her dreams of becoming a doctor.",
      story: "<p>Laxmi tells the story of a young woman from a rural Odia village who dares to dream of becoming a doctor in a society that expects her to be married off early and forget about education. Laxmi, played with remarkable depth by Elina Samantray, is the eldest daughter of a poor farmer who, despite the family's financial struggles and the village elders' disapproval, receives unwavering support from her father in pursuing her education.</p><p>The film is particularly powerful in its portrayal of rural Odisha — its traditions, its festivals, its close-knit community bonds, and the deeply embedded gender biases that rural women navigate daily. Director Suneel Mohanty shows great sensitivity in depicting the village world without condescension or exoticism; the community is portrayed with both its warmth and its limitations.</p><p>The film's second half, set largely in the medical college, deals with the different but equally real challenges Laxmi faces as a first-generation college student from a rural background navigating an urban, privileged environment. Her resilience, intelligence, and fundamental decency win over even those initially dismissive of her.</p>",
      review: "<p>Laxmi is a beautifully crafted social drama that showcases the best of Odia cinema's storytelling tradition. Elina Samantray is extraordinary in the title role — her performance is restrained, dignified, and deeply moving without ever sliding into sentimentality. She carries the film on her capable shoulders and delivers what may be a career-defining performance.</p><p>Director Suneel Mohanty demonstrates a sensitive understanding of rural Odisha's social landscape. The film never sensationalizes or oversimplifies the challenges its protagonist faces; instead, it portrays them with nuance and a fundamental respect for the dignity of all its characters. Rating: 8/10.</p>",
      boxOffice: { opening: "₹0.9 Cr", firstWeek: "₹5 Cr", total: "₹12 Cr" },
      media: {
        trailer: { ytId: "" },
        songs: [
          { title: "Laxmi Naam Kede", singer: "Asima Panda", musicDirector: "Abhijit Majumdar" },
          { title: "Maa Tume Sagara", singer: "Namita Agrawal", musicDirector: "Abhijit Majumdar" },
        ],
      },
      cast: [{ castId: castDocs[1]._id, name: "Elina Samantray", type: "Actress", role: "Laxmi (Lead)" }],
      interestedYes: 198, interestedNo: 12,
    },
    {
      title: "Sarsatia", releaseDate: "2023-08-04", genre: ["Action","Romance","Thriller"],
      director: "Debasish Mallick", runtime: "140 min",
      language: "Odia", contentRating: "U/A", verdict: "Hit", status: "Released",
      imdbRating: "7.4",
      synopsis: "A street-smart young man from Bhubaneswar falls in love while being hunted by a ruthless criminal network he is desperately trying to leave behind.",
      story: "<p>Sarsatia opens in the labyrinthine lanes of old Bhubaneswar, where Ravi — played with brooding intensity by Sabyasachi Mishra — has grown up surviving by his wits on the fringes of the city's criminal underworld. Not a villain himself but someone who has done favours for the wrong people, Ravi is desperate to cut his ties with the past and build a legitimate life.</p><p>His plans are complicated when he falls for Priya (Barsha Priyadarshini), a spirited college student whose warmth and moral clarity force Ravi to confront the person he has become and the person he wants to be. Their romance, which unfolds against the backdrop of Bhubaneswar's rapidly changing cityscape, provides the film's emotional core.</p><p>The film's villain — a coldly methodical criminal kingpin who views Ravi as an asset he owns — is one of the most well-written antagonists in recent Odia cinema. The cat-and-mouse tension between him and Ravi gives the film its thriller edge, while the love story keeps it grounded in human emotion.</p>",
      review: "<p>Sarsatia is a slick, entertaining action romance that showcases Odia cinema's growing technical capabilities. Sabyasachi Mishra brings his characteristic intensity to the role of Ravi, making the character genuinely compelling. Barsha Priyadarshini is charming and holds her own in what could have been a decorative role — she brings intelligence and spirit to Priya.</p><p>Director Debasish Mallick keeps the pacing brisk and the action sequences are well-choreographed. The cinematography captures contemporary Bhubaneswar beautifully — its new tech corridors, its old neighbourhoods, its contrasts. Sarsatia is a crowd-pleasing entertainer that delivers on its promises while offering more depth than the genre typically requires. Rating: 7/10.</p>",
      boxOffice: { opening: "₹1.2 Cr", firstWeek: "₹6.5 Cr", total: "₹15 Cr" },
      media: { trailer: { ytId: "" }, songs: [
        { title: "Sarsatia Re", singer: "Aseema Panda", musicDirector: "Santanu Mahapatra" },
        { title: "Pagala Pabana", singer: "Human Sagar", musicDirector: "Santanu Mahapatra" },
      ]},
      cast: [
        { castId: castDocs[2]._id, name: "Sabyasachi Mishra", type: "Actor", role: "Ravi (Lead)" },
        { castId: castDocs[3]._id, name: "Barsha Priyadarshini", type: "Actress", role: "Priya" },
      ],
      interestedYes: 215, interestedNo: 31,
    },
    {
      title: "Bindusagar", releaseDate: "2026-01-01", genre: ["Action","Drama"],
      director: "TBA", runtime: "TBA", releaseTBA: true,
      language: "Odia", contentRating: "", verdict: "Upcoming", status: "Upcoming",
      synopsis: "An upcoming Odia action drama set against the backdrop of Bhubaneswar's iconic Bindu Sagar lake, where a young hero confronts forces threatening the city's heritage and peace.",
      boxOffice: { opening: "TBA", firstWeek: "TBA", total: "TBA" },
      media: { trailer: { ytId: "" }, songs: [] },
      cast: [],
      interestedYes: 89, interestedNo: 5,
    },
  ];

  for (const m of moviesSeed) {
    const existing = await Movie.findOne({ title: m.title });
    if (existing) { console.log("  Movie exists:", m.title); continue; }
    const s = makeSlug(m.title, m.releaseDate);
    await Movie.create({ ...m, slug: s, productionId: prodId });
    console.log("  Movie created:", m.title, `(${s})`);
  }

  // ── Blogs ──────────────────────────────────────────────────────
  const blogsSeed = [
    {
      title: "Top 10 Odia Movies of All Time You Must Watch",
      slug: "top-10-odia-movies-all-time",
      excerpt: "From classic devotional films to modern blockbusters, our definitive list of Odia films every cinema lover must experience.",
      category: "Top 10", tags: ["Odia movies","Ollywood","Best Odia films"],
      published: true, featured: true, views: 1240, readTime: 8,
      author: "Ollypedia Team",
      seoTitle: "Top 10 Best Odia Movies of All Time",
      seoDesc: "Discover the greatest Odia films ever made — our definitive list spanning decades of Ollywood cinema.",
      content: "<h2>The Greatest Films of Odia Cinema</h2><p>Odia cinema, fondly known as Ollywood, has a rich history spanning over eight decades. From its humble beginnings in 1936 with <em>Sita Bibaha</em> to the present day where films regularly cross crores at the box office, this industry has produced remarkable cinematic achievements.</p><h2>1. Daman (2022)</h2><p>Daman stands as the crown jewel of contemporary Odia cinema. Starring Babushaan Mohanty in a career-best performance, this socially conscious drama about a government officer fighting corruption in tribal Odisha became a cultural phenomenon. The film collected over ₹25 crore, making it one of the biggest hits in Ollywood history.</p><h2>2. Tu Mo Love Story (2009)</h2><p>Babushaan Mohanty's debut film became a landmark for its generation. The fresh performances, melodious soundtrack, and honest portrayal of young love made it an instant classic still loved today.</p><h2>3. Laila (2009)</h2><p>Laila marked a watershed moment for modern Odia cinema, introducing a new visual language to Ollywood — slick production values, high-energy music, and contemporary storytelling that appealed to younger audiences.</p><h2>4. Sital Shastha (2014)</h2><p>A powerful family drama examining bonds between siblings across social and economic divides, praised for its sensitive script and emotionally resonant storytelling.</p><h2>5. Premare Kahile Na (2015)</h2><p>A landmark romantic film that became a massive commercial success. Its central love story, beautiful Odia locations, and outstanding soundtrack made it one of the most beloved Odia films of the decade.</p><h2>Why Odia Cinema Matters</h2><p>Odia films reflect the culture, traditions, language, and spirit of Odisha's people in a way no other medium can. They preserve and celebrate Odia folklore, mythology, music, and social commentary. Supporting Odia cinema is about preserving a cultural heritage that belongs to all Odias.</p>",
    },
    {
      title: "Babushaan Mohanty: The King of Ollywood",
      slug: "babushaan-mohanty-king-of-ollywood",
      excerpt: "An in-depth look at how Babushaan Mohanty became the biggest superstar in Odia cinema and what makes him special.",
      category: "Actor Spotlight", tags: ["Babushaan Mohanty","Odia actor","Ollywood star"],
      published: true, featured: false, views: 890, readTime: 7,
      author: "Ollypedia Team",
      content: "<h2>The Making of a Superstar</h2><p>In the history of Odia cinema, few actors have achieved the kind of sustained stardom and critical acclaim that Babushaan Mohanty commands today. Born December 18, 1987, into one of Ollywood's most celebrated families — his father is legendary comedian Mihir Das — Babushaan earned his superstardom through years of hard work, intelligent role choices, and a constant desire to challenge himself as an actor.</p><h2>A Star Is Born: Tu Mo Love Story (2009)</h2><p>Babushaan's debut became a massive commercial success and introduced Odia audiences to a new kind of romantic hero — sensitive, modern, and relatable. His natural charm and effortless screen presence made him an instant star.</p><h2>The Daman Phenomenon</h2><p>Daman was not just a film — it was a cultural event for Odisha. Released in 2022, it became the highest-grossing Odia film of its time, collecting over ₹25 crore. Babushaan's commitment to the role, including extensive research into tribal communities and block-level governance, elevated the film beyond its genre. His performance earned widespread critical acclaim and comparisons to the finest actors in Indian regional cinema.</p><h2>Legacy and Impact</h2><p>Babushaan Mohanty has raised the bar for production values, storytelling ambition, and acting standards in Ollywood. His popularity has attracted bigger budgets, better technicians, and greater national attention to Odia films. He represents not just the present of Odia cinema but its exciting future.</p>",
    },
    {
      title: "The Rise of Odia Cinema: A Complete History of Ollywood",
      slug: "history-of-odia-cinema-ollywood",
      excerpt: "From the first Odia talkie in 1936 to modern blockbusters — a comprehensive look at nine decades of Odia film history.",
      category: "General", tags: ["Odia cinema history","Ollywood history","Odia film heritage"],
      published: true, featured: false, views: 650, readTime: 12,
      author: "Ollypedia Team",
      content: "<h2>The Birth of Odia Cinema (1936–1960)</h2><p>The story begins in 1936 with <em>Sita Bibaha</em>, the first Odia talkie, produced by Mohan Sundar Dev Goswami. This mythological film based on Lord Ram and Sita's marriage established a template that would define Odia cinema for decades: stories rooted in Odisha's mythological and spiritual heritage, music drawn from classical and folk traditions, and characters reflecting Odia social values.</p><h2>The Golden Age (1960–1980)</h2><p>The 1960s and 1970s are widely regarded as the golden age of Odia cinema. Films like <em>Malajanha</em> (1960) demonstrated that Odia cinema could tell stories of genuine literary quality with matching cinematic craft. The music of this era was particularly distinguished — composers created songs that became part of Odia cultural heritage, still sung at festivals and family gatherings across Odisha today.</p><h2>Commercial Cinema (1980–2000)</h2><p>The 1980s and 1990s saw Odia cinema become more commercially oriented, with action films, romantic dramas, and comedies dominating the box office. Stars like Mihir Das and Siddhanta Mahapatra became household names, their films drawing millions across Odisha.</p><h2>The New Ollywood (2000–Present)</h2><p>Better technology, higher budgets, and a new generation of professionally trained filmmakers brought fresh energy to Ollywood. Stars like Babushaan Mohanty, Elina Samantray, and Barsha Priyadarshini became the faces of a reimagined, more ambitious Odia film industry. Films like Daman (2022) prove that Ollywood can produce commercially successful films that also tackle serious social themes with artistic integrity. The industry's future has never looked brighter.</p>",
    },
  ];

  for (const b of blogsSeed) {
    const existing = await Blog.findOne({ slug: b.slug });
    if (existing) { console.log("  Blog exists:", b.title); continue; }
    await Blog.create(b);
    console.log("  Blog created:", b.title);
  }

  // ── News ──────────────────────────────────────────────────────
  const newsSeed = [
    { title: "Daman Crosses ₹25 Crore at Odia Box Office",
      content: "Babushaan Mohanty's blockbuster Daman has crossed the ₹25 crore mark, making it one of the highest-grossing Odia films of all time. The film continues to draw audiences in its extended theatrical run.",
      category: "Box Office", published: true, movieTitle: "Daman", newsType: "article" },
    { title: "Elina Samantray Announced as Brand Ambassador for Odisha Tourism",
      content: "Popular Odia actress Elina Samantray has been announced as the new brand ambassador for Odisha Tourism. The announcement was made at a ceremony in Bhubaneswar attended by senior government officials and industry leaders.",
      category: "Celebrity", published: true, newsType: "article" },
    { title: "International Odia Film Festival to Showcase Best of Ollywood",
      content: "A new international Odia film festival is being organized in Bhubaneswar to showcase the best of Ollywood cinema to national and international audiences. The festival will feature retrospectives, world premieres, and panel discussions with major filmmakers.",
      category: "Industry", published: true, newsType: "article" },
    { title: "Babushaan Mohanty's Next Film Announced with Record Budget",
      content: "Odia superstar Babushaan Mohanty has announced his next film, which will have the biggest budget ever for an Odia production. The film will be directed by a National Award-winning filmmaker and is expected to begin production this year.",
      category: "Announcement", published: true, newsType: "article" },
  ];

  for (const n of newsSeed) {
    const existing = await News.findOne({ title: n.title });
    if (existing) { console.log("  News exists:", n.title); continue; }
    await News.create(n);
    console.log("  News created:", n.title);
  }

  console.log("\n Seed complete! Run: npm run dev and visit http://localhost:3000");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
