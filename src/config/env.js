const dotenv = require("dotenv");

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function optional(name, fallback) {
  return process.env[name] ?? fallback;
}

function optionalAny(names, fallback) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== "") return value;
  }
  return fallback;
}

const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "8080")),

  MONGO_URI: required("MONGO_URI"),

  BOT_TOKEN: required("BOT_TOKEN"),

  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),

  ADMIN_TELEGRAM_IDS: optional("ADMIN_TELEGRAM_IDS", ""),

  CORS_ORIGIN: optional("CORS_ORIGIN", ""),

  HIVEMQ_HOST: optionalAny(["HIVEMQ_HOST", "HiveMQhost"], ""),
  HIVEMQ_USERNAME: optionalAny(["HIVEMQ_USERNAME", "HiveMQusername"], ""),
  HIVEMQ_PASSWORD: optionalAny(["HIVEMQ_PASSWORD", "HiveMQpassword"], ""),
  MQTT_TELEMETRY_TOPIC: optional("MQTT_TELEMETRY_TOPIC", "devices/+/telemetry"),
  MQTT_COMMAND_TOPIC_TEMPLATE: optional("MQTT_COMMAND_TOPIC_TEMPLATE", "devices/{imei}/command"),

  OPENAI_API_KEY: optionalAny(["OPENAI_API_KEY", "ApiOpenAI"], ""),
  OPENAI_MODEL: optional("OPENAI_MODEL", "gpt-4o-mini")
};

module.exports = { env };
