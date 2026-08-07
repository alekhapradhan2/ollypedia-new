import { connectDB } from "./db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";

/**
 * Updates all embedded `name` and `photo` fields in `Movie.cast` arrays
 * across all movies whenever a Cast member's name or photo changes.
 */
export async function syncCastEmbeddedData(castId: string, name?: string, photo?: string) {
  await connectDB();
  if (!castId) return;

  const updateFields: Record<string, any> = {};
  if (name !== undefined) updateFields["cast.$[elem].name"] = name;
  if (photo !== undefined) updateFields["cast.$[elem].photo"] = photo;

  if (Object.keys(updateFields).length === 0) return;

  await Movie.updateMany(
    { "cast.castId": castId },
    { $set: updateFields },
    { arrayFilters: [{ "elem.castId": castId }] }
  );
}

/**
 * Recalculates and updates the `movies` array on a `Cast` document
 * so it strictly contains the ObjectIds of movies where this cast member appears.
 */
export async function syncCastMoviesArray(castId: string) {
  await connectDB();
  if (!castId) return;

  const movies = await Movie.find({ "cast.castId": castId }).select("_id").lean();
  const movieIds = movies.map((m: any) => m._id);

  await Cast.findByIdAndUpdate(castId, { $set: { movies: movieIds } });
}

/**
 * Ensures all cast members referenced in a movie's `cast` array have
 * that movie's `_id` in their `Cast.movies` array, and removes the movie ID
 * from cast members who were removed from the movie.
 */
export async function syncMovieCastRelations(movieId: string, castEntries: any[]) {
  await connectDB();
  if (!movieId) return;

  const currentCastIds = (castEntries || [])
    .map((c: any) => c.castId ? String(c.castId) : null)
    .filter(Boolean) as string[];

  // Add movie to current cast members
  if (currentCastIds.length > 0) {
    await Cast.updateMany(
      { _id: { $in: currentCastIds } },
      { $addToSet: { movies: movieId } }
    );
  }

  // Remove movie from cast members no longer in this movie
  await Cast.updateMany(
    { movies: movieId, _id: { $nin: currentCastIds } },
    { $pull: { movies: movieId } }
  );
}

/**
 * Full repair and migration function.
 * Iterates all Movies and Cast members to ensure:
 * 1. Embedded `name` and `photo` in `Movie.cast` match the current `Cast` model values.
 * 2. `Cast.movies` arrays are 100% in sync with `Movie.cast` arrays.
 */
export async function syncAllCastAndMovies() {
  await connectDB();

  const allCast = await Cast.find().lean();
  const castMap = new Map<string, any>();
  for (const c of allCast) {
    castMap.set(String(c._id), c);
  }

  const movies = await Movie.find().lean();
  let updatedMoviesCount = 0;

  // Map of castId -> Set of movieIds where they appear
  const castMovieMap = new Map<string, Set<string>>();

  for (const movie of movies) {
    const movieIdStr = String(movie._id);
    let castModified = false;
    const updatedCastList = (movie.cast || []).map((entry: any) => {
      const cId = entry.castId ? String(entry.castId) : null;
      if (!cId) return entry;

      if (!castMovieMap.has(cId)) {
        castMovieMap.set(cId, new Set());
      }
      castMovieMap.get(cId)!.add(movieIdStr);

      const castDoc = castMap.get(cId);
      if (castDoc) {
        const newName = castDoc.name || entry.name;
        const newPhoto = castDoc.photo || entry.photo;

        if (entry.name !== newName || entry.photo !== newPhoto) {
          castModified = true;
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
      await Movie.collection.updateOne({ _id: movie._id as any }, { $set: { cast: updatedCastList } });
      updatedMoviesCount++;
    }
  }

  // Now sync Cast.movies array for every cast member
  let updatedCastCount = 0;
  for (const castDoc of allCast) {
    const cId = String(castDoc._id);
    const actualMovieIds = Array.from(castMovieMap.get(cId) || []);
    const existingMovieIds = (castDoc.movies || []).map((m: any) => String(m));

    const isDifferent =
      actualMovieIds.length !== existingMovieIds.length ||
      actualMovieIds.some((id) => !existingMovieIds.includes(id));

    if (isDifferent) {
      await Cast.findByIdAndUpdate(castDoc._id, { $set: { movies: actualMovieIds } });
      updatedCastCount++;
    }
  }

  return {
    totalMovies: movies.length,
    updatedMovies: updatedMoviesCount,
    totalCast: allCast.length,
    updatedCast: updatedCastCount,
  };
}
