const { env } = require("../config/env");

async function generateDeviceCommand({ template, lastTelemetry, userPrompt }) {
  if (!env.OPENAI_API_KEY) {
    const err = new Error("OPENAI_API_KEY not configured");
    err.statusCode = 400;
    throw err;
  }

  const system = [
    "Ты помощник для управления IoT устройством.",
    "Верни ТОЛЬКО JSON без пояснений.",
    "Формат: {\"command\": { ... }, \"explanation\": \"...\" }",
    "Команда должна быть безопасной и простой."
  ].join("\n");

  const body = {
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({ template, lastTelemetry, prompt: userPrompt })
      }
    ],
    temperature: 0.2
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`OpenAI error: ${resp.status} ${text}`);
    err.statusCode = 502;
    throw err;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const err = new Error("AI returned invalid JSON");
    err.statusCode = 502;
    throw err;
  }
  return parsed;
}

module.exports = { generateDeviceCommand };

