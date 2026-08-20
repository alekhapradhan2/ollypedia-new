const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri = "mongodb://alekhpradhan18:Alekh123@ac-msxprya-shard-00-00.y0pbxv7.mongodb.net:27017,ac-msxprya-shard-00-01.y0pbxv7.mongodb.net:27017,ac-msxprya-shard-00-02.y0pbxv7.mongodb.net:27017/?ssl=true&replicaSet=atlas-h4p3hf-shard-0&authSource=admin&appName=Cluster0";

async function main() {
  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash("Admin@12345", 10);
  
  await mongoose.connection.db.collection("communityusers").updateOne(
    { username: "alekh" },
    { 
      $set: { 
        role: "admin",
        passwordHash: passwordHash
      } 
    }
  );
  console.log("Admin credentials set for alekh successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
