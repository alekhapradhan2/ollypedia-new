require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const collection = db.collection('movies');
    
    const count = await collection.countDocuments({ "ott.platform": { $exists: true, $ne: "" } });
    console.log("Count of movies with OTT platform:", count);
    
    // Add dummy OTT data to one movie if none exist
    if (count === 0) {
      const movie = await collection.findOne({ releaseDate: { $ne: null } });
      if (movie) {
        await collection.updateOne(
          { _id: movie._id },
          { $set: { 
            "ott": {
              platform: "Tarang Plus",
              status: "Streaming",
              releaseDate: new Date().toISOString(),
              watchUrl: "https://tarangplus.in"
            }
          } }
        );
        console.log("Added dummy OTT data to movie:", movie.title);
      }
    } else {
        const docs = await collection.find({ "ott.platform": { $exists: true, $ne: "" } }).limit(2).toArray();
        console.log("Existing OTT Movies:", JSON.stringify(docs, null, 2));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
