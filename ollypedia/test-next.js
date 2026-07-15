import mongoose from "mongoose";
import { connectDB } from "./src/lib/db.js";
import Movie from "./src/models/Movie.js";

async function testFetch() {
  await connectDB();
  const today = new Date().toISOString().split("T")[0];

  try {
    const upcoming = await Movie.aggregate([
      {
        $match: {
          $or: [
            { releaseTBA: true },
            { releaseDate: { $gt: today } },
          ],
          $and: [{
            $or: [
              { "media.trailer.ytId":      { $exists: true, $ne: "" } },
              { "media.teaser.ytId":       { $exists: true, $ne: "" } },
              { "media.motionPoster.ytId": { $exists: true, $ne: "" } },
              { "media.firstLook.ytId":    { $exists: true, $ne: "" } },
            ],
          }],
        },
      },
      { $project: { title: 1 } },
    ]);
    console.log("UPCOMING:", upcoming.length);
  } catch (err) {
    console.error("UPCOMING ERROR:", err.message);
  }

  try {
    const videoMatch = {
      $or: [
        { "media.trailer.ytId":      { $exists: true, $ne: "" } },
        { "media.teaser.ytId":       { $exists: true, $ne: "" } },
        { "media.motionPoster.ytId": { $exists: true, $ne: "" } },
        { "media.firstLook.ytId":    { $exists: true, $ne: "" } },
      ],
    };
    const all = await Movie.aggregate([
      { $match: videoMatch },
      { $project: { reviews: 0, story: 0 } },
      {
        $addFields: {
          _isReleased: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$releaseDate", false] },
                  { $ne: ["$releaseDate", ""] },
                  { $lte: ["$releaseDate", today] },
                  { $ne: ["$verdict", "Upcoming"] },
                  { $ne: ["$releaseTBA", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      { $limit: 1 }
    ]);
    console.log("ALL:", all.length);
  } catch (err) {
    console.error("ALL ERROR:", err.message);
  }
  
  process.exit(0);
}

testFetch();
