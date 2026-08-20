const mongoose = require("mongoose");
const uri = "mongodb://alekhpradhan18:Alekh123@ac-msxprya-shard-00-00.y0pbxv7.mongodb.net:27017,ac-msxprya-shard-00-01.y0pbxv7.mongodb.net:27017,ac-msxprya-shard-00-02.y0pbxv7.mongodb.net:27017/?ssl=true&replicaSet=atlas-h4p3hf-shard-0&authSource=admin&appName=Cluster0";

async function main() {
  await mongoose.connect(uri);
  const res = await mongoose.connection.db.collection("communityusers").updateMany(
    { $or: [{ username: "alekh" }, { email: "alekhpradhan18@gmail.com" }] },
    { $set: { role: "admin" } }
  );
  console.log("Updated users to admin:", res.modifiedCount);
  const users = await mongoose.connection.db.collection("communityusers").find({}).project({ username: 1, email: 1, role: 1 }).toArray();
  console.log("Current Users:", users);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
