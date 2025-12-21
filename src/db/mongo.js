const mongoose = require("mongoose");

async function connectMongo(uri) {
  await mongoose.connect(uri);
}

module.exports = { connectMongo };

