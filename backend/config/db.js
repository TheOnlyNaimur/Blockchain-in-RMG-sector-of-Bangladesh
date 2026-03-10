const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.database_url;
  if (!uri) throw new Error("MONGO_URI or database_url must be set in .env");

  await mongoose.connect(uri);
  console.log(`   MongoDB connected → ${mongoose.connection.name}`);
}

module.exports = connectDB;
