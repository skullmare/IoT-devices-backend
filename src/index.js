const http = require("http");

const { createApp } = require("./app");
const { env } = require("./config/env");
const { connectMongo } = require("./db/mongo");
const { startMqtt } = require("./services/mqttService");
const { startWs } = require("./services/wsService");

async function main() {
  // Подключаемся без параметров (функция будет читать process.env)
  await connectMongo(env.MONGO_URI, env.MONGO_DB);

  const app = createApp();
  const server = http.createServer(app);

  startWs(server);
  startMqtt();

  server.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});