const mongoose = require("mongoose");

async function connectMongo(mongoUri, dbName) {
  const uri = mongoUri || process.env.MONGO_URI;
  const databaseName = dbName || process.env.MONGO_DB;

  if (!uri) throw new Error("MONGO_URI is not defined");
  if (!databaseName) throw new Error("MONGO_DB is not defined");

  const connectionUri = uri.endsWith('/')
    ? `${uri}${databaseName}`
    : `${uri}/${databaseName}`;

  const maskedUri = connectionUri.replace(/(mongodb:\/\/[^:]+:)[^@]+@/, '$1****@');
  console.log(`🔌 Connecting to MongoDB: ${maskedUri}`);

  await mongoose.connect(connectionUri, {
    authSource: 'admin',
  });

  console.log("✅ MongoDB connected successfully");
}

async function disconnectMongo() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("✅ MongoDB disconnected gracefully");
    }
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', disconnectMongo);
process.on('SIGTERM', disconnectMongo);

module.exports = { 
  connectMongo, 
  disconnectMongo 
};