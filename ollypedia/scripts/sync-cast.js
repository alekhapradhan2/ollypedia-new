/**
 * Ollypedia Cast & Movie Sync Script
 * Usage: node scripts/sync-cast.js
 * Synchronizes embedded cast names and photos in all Movie documents,
 * and fixes Cast.movies arrays to match Movie.cast source of truth.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

if (!process.env.MONGODB_URI) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("MONGODB_URI not set in .env.local");
  process.exit(1);
}

const CastSchema = new mongoose.Schema(
  { name: String, type: String, photo: String, movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }] },
  { timestamps: true, strict: false }
);

const MovieSchema = new mongoose.Schema(
  {
    title: String,
    cast: [
      {
        castId: { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
        name: String,
        photo: String,
        type: String,
        role: String,
      },
    ],
  },
  { timestamps: true, strict: false }
);

const Cast = mongoose.models.Cast || mongoose.model("Cast", CastSchema);
const Movie = mongoose.models.Movie || mongoose.model("Movie", MovieSchema);

async function syncAll() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const allCast = await Cast.find().lean();
  const castMap = new Map();
  for (const c of allCast) {
    castMap.set(String(c._id), c);
  }

  const movies = await Movie.find().lean();
  let updatedMoviesCount = 0;
  const castMovieMap = new Map();

  console.log(`Processing ${movies.length} movies and ${allCast.length} cast members...`);

  for (const movie of movies) {
    const movieIdStr = String(movie._id);
    let castModified = false;
    const updatedCastList = (movie.cast || []).map((entry) => {
      const cId = entry.castId ? String(entry.castId) : null;
      if (!cId) return entry;

      if (!castMovieMap.has(cId)) {
        castMovieMap.set(cId, new Set());
      }
      castMovieMap.get(cId).add(movieIdStr);

      const castDoc = castMap.get(cId);
      if (castDoc) {
        const newName = castDoc.name || entry.name;
        const newPhoto = castDoc.photo || entry.photo;

        if (entry.name !== newName || entry.photo !== newPhoto) {
          castModified = true;
          console.log(`  Updating movie "${movie.title}": Cast member "${entry.name}" -> name: "${newName}", photo: "${newPhoto}"`);
        }

        return {
          ...entry,
          name: newName,
          photo: newPhoto,
        };
      }
      return entry;
    });

    if (castModified) {
      await Movie.collection.updateOne({ _id: movie._id }, { $set: { cast: updatedCastList } });
      updatedMoviesCount++;
    }
  }

  let updatedCastCount = 0;
  for (const castDoc of allCast) {
    const cId = String(castDoc._id);
    const actualMovieIds = Array.from(castMovieMap.get(cId) || []);
    const existingMovieIds = (castDoc.movies || []).map((m) => String(m));

    const isDifferent =
      actualMovieIds.length !== existingMovieIds.length ||
      actualMovieIds.some((id) => !existingMovieIds.includes(id));

    if (isDifferent) {
      await Cast.findByIdAndUpdate(castDoc._id, { $set: { movies: actualMovieIds } });
      updatedCastCount++;
      console.log(`  Updated movies array for Cast "${castDoc.name}": was [${existingMovieIds.length}], now [${actualMovieIds.length}] movies.`);
    }
  }

  console.log("----------------------------------------");
  console.log(`Sync Complete!`);
  console.log(`- Movies Updated: ${updatedMoviesCount} / ${movies.length}`);
  console.log(`- Cast Documents Updated: ${updatedCastCount} / ${allCast.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

syncAll().catch((err) => {
  console.error("Sync script failed:", err);
  process.exit(1);
});
