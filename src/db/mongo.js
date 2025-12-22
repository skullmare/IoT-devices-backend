const mongoose = require("mongoose");

async function connectMongo() {
  try {
    // Получаем URI из переменных окружения
    const mongoUri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB;
    
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    
    // Если в URI уже указана база данных, используем как есть
    // Иначе добавляем имя базы данных к URI
    let connectionUri = mongoUri;
    
    // Проверяем, есть ли уже имя базы данных в URI
    const hasDbName = mongoUri.match(/\/[^\/?]+(\?|$)/);
    
    if (!hasDbName && dbName) {
      // Добавляем слэш и имя базы данных, если его еще нет
      connectionUri = mongoUri.endsWith('/') 
        ? `${mongoUri}${dbName}` 
        : `${mongoUri}/${dbName}`;
    }
    
    console.log(`Connecting to MongoDB: ${connectionUri.replace(/:[^:@]*@/, ':***@')}`); // Маскируем пароль в логах
    
    // Опции подключения
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Дополнительные опции для аутентификации, если нужно
    };
    
    await mongoose.connect(connectionUri, options);
    
    console.log("✅ MongoDB connected successfully");
    
    // Обработчики событий подключения
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

// Функция для отключения (опционально)
async function disconnectMongo() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}

module.exports = { connectMongo, disconnectMongo };