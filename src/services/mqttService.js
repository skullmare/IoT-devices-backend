const mqtt = require("mqtt");

const { env } = require("../config/env");
const { Device } = require("../models/Device");
const { Telemetry } = require("../models/Telemetry");
const { eventBus } = require("./eventBus");

let client = null;

function parseHostPort(hostPort) {
  const [host, portRaw] = String(hostPort || "").split(":");
  const port = Number(portRaw || "8883");
  return { host, port };
}

function extractImeiFromTopic(topic) {
  // devices/{imei}/telemetry
  const parts = String(topic || "").split("/");
  if (parts.length < 3) return null;
  if (parts[0] !== "devices") return null;
  return parts[1] || null;
}

function startMqtt() {
  if (!env.HIVEMQ_HOST) {
    console.warn("HIVEMQ_HOST not set, MQTT ingestion disabled");
    return;
  }

  const { host, port } = parseHostPort(env.HIVEMQ_HOST);
  if (!host) {
    console.warn("Invalid HIVEMQ_HOST, MQTT ingestion disabled");
    return;
  }

  const url = `mqtts://${host}:${port}`;
  client = mqtt.connect(url, {
    username: env.HIVEMQ_USERNAME,
    password: env.HIVEMQ_PASSWORD,
    reconnectPeriod: 2000,
    connectTimeout: 10000
  });

  client.on("connect", () => {
    console.log("MQTT connected");
    client.subscribe(env.MQTT_TELEMETRY_TOPIC, (err) => {
      if (err) console.error("MQTT subscribe error:", err);
      else console.log("MQTT subscribed:", env.MQTT_TELEMETRY_TOPIC);
    });
  });

  client.on("message", async (topic, payloadBuf) => {
    try {
      const imei = extractImeiFromTopic(topic);
      if (!imei) return;

      const payloadText = payloadBuf.toString("utf8");
      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch {
        payload = { value: payloadText };
      }

      const device = await Device.findOne({ imei }).select("_id imei").lean();
      if (!device) return;

      await Device.updateOne(
        { _id: device._id },
        { $set: { lastSeenAt: new Date(), lastTelemetry: payload } }
      );

      await Telemetry.create({ device: device._id, imei, payload });

      eventBus.emit("telemetry", {
        deviceId: device._id.toString(),
        imei,
        payload,
        receivedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("MQTT message handling error:", err);
    }
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
  });
}

async function publishCommand(imei, commandPayload) {
  if (!client) throw new Error("MQTT client not started");
  const topic = env.MQTT_COMMAND_TOPIC_TEMPLATE.replace("{imei}", imei);
  const message = JSON.stringify(commandPayload ?? {});
  await new Promise((resolve, reject) => {
    client.publish(topic, message, { qos: 0 }, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { startMqtt, publishCommand };

