const jwt = require("jsonwebtoken");
const { WebSocketServer } = require("ws");

const { env } = require("../config/env");
const { eventBus } = require("./eventBus");
const { canAccessDevice } = require("./deviceAccessService");

function safeSend(ws, obj) {
  if (ws.readyState !== 1) return; // OPEN
  ws.send(JSON.stringify(obj));
}

function startWs(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clientInfo = new Map(); // ws -> { userId, role, subscriptions:Set<string> }
  const deviceSubscribers = new Map(); // deviceId -> Set<ws>

  function unsubscribeAll(ws) {
    const info = clientInfo.get(ws);
    if (!info) return;
    for (const deviceId of info.subscriptions) {
      const set = deviceSubscribers.get(deviceId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) deviceSubscribers.delete(deviceId);
      }
    }
    info.subscriptions.clear();
  }

  wss.on("connection", (ws, req) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        safeSend(ws, { type: "error", error: "Unauthorized" });
        return ws.close();
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      clientInfo.set(ws, { userId: String(decoded.sub), role: decoded.role, subscriptions: new Set() });
      safeSend(ws, { type: "ready" });
    } catch {
      safeSend(ws, { type: "error", error: "Unauthorized" });
      return ws.close();
    }

    ws.on("message", async (buf) => {
      try {
        const info = clientInfo.get(ws);
        if (!info) return;
        const text = buf.toString("utf8");
        const msg = JSON.parse(text);

        if (msg.type === "ping") return safeSend(ws, { type: "pong" });
        if (msg.type === "subscribe") {
          const deviceId = String(msg.deviceId || "");
          if (!deviceId) return safeSend(ws, { type: "error", error: "deviceId required" });

          const allowed = await canAccessDevice(info.userId, deviceId);
          if (!allowed) return safeSend(ws, { type: "error", error: "Forbidden" });

          info.subscriptions.add(deviceId);
          if (!deviceSubscribers.has(deviceId)) deviceSubscribers.set(deviceId, new Set());
          deviceSubscribers.get(deviceId).add(ws);
          return safeSend(ws, { type: "subscribed", deviceId });
        }

        if (msg.type === "unsubscribe") {
          const deviceId = String(msg.deviceId || "");
          const info2 = clientInfo.get(ws);
          if (!info2) return;
          info2.subscriptions.delete(deviceId);
          const set = deviceSubscribers.get(deviceId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) deviceSubscribers.delete(deviceId);
          }
          return safeSend(ws, { type: "unsubscribed", deviceId });
        }

        return safeSend(ws, { type: "error", error: "Unknown message type" });
      } catch {
        return safeSend(ws, { type: "error", error: "Bad message" });
      }
    });

    ws.on("close", () => {
      unsubscribeAll(ws);
      clientInfo.delete(ws);
    });
  });

  eventBus.on("telemetry", (evt) => {
    const set = deviceSubscribers.get(evt.deviceId);
    if (!set) return;
    for (const ws of set) safeSend(ws, { type: "telemetry", ...evt });
  });

  console.log("WebSocket server on /ws");
}

module.exports = { startWs };
