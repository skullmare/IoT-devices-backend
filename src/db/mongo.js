const mongoose = require("mongoose");

async function connectMongo(mongoUri) {
  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected successfully");
}

module.exports = { 
  connectMongo,
};