const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { env } = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const templateRoutes = require("./routes/templateRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const groupRoutes = require("./routes/groupRoutes");
const aiRoutes = require("./routes/aiRoutes");

// Новый роут для симулятора
const deviceSimulatorRoutes = require("./routes/deviceSimulator");

// Добавляем роут для телеметрии
const telemetryRoutes = require("./routes/telemetryRoutes");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/templates", templateRoutes);
  app.use("/api/devices", deviceRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/ai", aiRoutes);

  // ✅ Подключаем новые роуты для симулятора
  app.use("/api/devices/simulator", deviceSimulatorRoutes);

  // ✅ Подключаем роуты для телеметрии
  app.use("/api/telemetry", telemetryRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };