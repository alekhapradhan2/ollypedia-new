const mongoose = require("mongoose");
const uri = "mongodb://alekhprdhan3305:Alekh3305@ac-p3lqope-shard-00-00.q0oow09.mongodb.net:27017,ac-p3lqope-shard-00-01.q0oow09.mongodb.net:27017,ac-p3lqope-shard-00-02.q0oow09.mongodb.net:27017/?ssl=true&replicaSet=atlas-izhewj-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const movie = await db.collection("movies").findOne({ "videos": { $exists: true, $not: {$size: 0} } });
  console.log("Movie with videos array:");
  if (movie) {
    console.log(JSON.stringify(movie.videos, null, 2));
    console.log("Movie Title:", movie.title);
  } else {
    console.log("No movies found with a non-empty 'videos' array!");
    
    // Check if there are ANY movies with 'videos' key
    const anyVideoMovie = await db.collection("movies").findOne({ videos: { $exists: true } });
    console.log("Any movie with 'videos' key exists?", !!anyVideoMovie);

    // Let's just grab the most recently updated movie to see its schema
    const latestMovie = await db.collection("movies").find().sort({ updatedAt: -1 }).limit(1).toArray();
    console.log("Latest movie keys:", Object.keys(latestMovie[0]));
    console.log("Latest movie videos:", latestMovie[0].videos);
    console.log("Latest movie media:", latestMovie[0].media);
  }
  process.exit(0);
});
