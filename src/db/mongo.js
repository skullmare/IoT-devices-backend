const mongoose = require("mongoose");

async function connectMongo(mongoUri, dbName) {
  try {
    // Гибкий выбор источника конфигурации:
    // 1. Параметры функции
    // 2. process.env
    // 3. env из config (если передается)
    const uri = mongoUri || process.env.MONGO_URI;
    const databaseName = dbName || process.env.MONGO_DB;
    
    if (!uri) {
      throw new Error("MongoDB URI is not defined. Check MONGO_URI in .env or config");
    }
    
    if (!databaseName) {
      throw new Error("MongoDB database name is not defined. Check MONGO_DB in .env or config");
    }
    
    // Создаем финальный URI
    const connectionUri = uri.endsWith('/') 
      ? `${uri}${databaseName}`
      : `${uri}/${databaseName}`;
    
    // Маскируем пароль для логов
    const maskedUri = connectionUri.replace(/(mongodb:\/\/[^:]+:)[^@]+@/, '$1****@');
    console.log(`🔌 Connecting to MongoDB: ${maskedUri}`);
    
    // Опции подключения
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: 'admin',
      dbName: databaseName
    };
    
    await mongoose.connect(connectionUri, options);
    
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🏠 Host: ${mongoose.connection.host}`);
    
    // Обработчики событий
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    return mongoose.connection;
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    // Детальная диагностика
    if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error: Cannot resolve MongoDB hostname');
    } else if (error.message.includes('Authentication failed')) {
      console.error('🔐 Authentication failed: Check username/password');
    }
    
    throw error;
  }
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