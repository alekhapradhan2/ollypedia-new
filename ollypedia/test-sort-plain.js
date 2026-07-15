const { MongoClient } = require("mongodb");

async function run() {
  const uri = "mongodb://alekhprdhan3305:Alekh3305@ac-p3lqope-shard-00-00.q0oow09.mongodb.net:27017,ac-p3lqope-shard-00-01.q0oow09.mongodb.net:27017,ac-p3lqope-shard-00-02.q0oow09.mongodb.net:27017/?ssl=true&replicaSet=atlas-izhewj-shard-0&authSource=admin&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const Movie = db.collection("movies");

    const today = new Date().toISOString().split("T")[0];
    const videoMatch = {
      $or: [
        { "media.trailer.ytId":      { $exists: true, $ne: "" } },
        { "media.teaser.ytId":       { $exists: true, $ne: "" } },
        { "media.motionPoster.ytId": { $exists: true, $ne: "" } },
        { "media.firstLook.ytId":    { $exists: true, $ne: "" } },
      ],
    };

    const movies = await Movie.aggregate([
      { $match: videoMatch },
      { $project: { title: 1, releaseDate: 1, releaseTBA: 1, verdict: 1 } },
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
          _releaseDateObj: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$releaseDate", false] },
                  { $ne: ["$releaseDate", ""] },
                ],
              },
              { $toDate: "$releaseDate" },
              null,
            ],
          },
        },
      },
      { $sort: { _isReleased: -1, _releaseDateObj: -1, _id: -1 } },
      { $limit: 10 },
    ]).toArray();

    console.log("TODAY:", today);
    movies.forEach(m => {
      console.log(`- ${m.title} | rel: ${m.releaseDate} | TBA: ${m.releaseTBA} | _isRel: ${m._isReleased} | _relObj: ${m._releaseDateObj}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
