import "dotenv/config";
import express from "express";
import cors from "cors";

import { properties } from "./data/properties.js";
import { getProperties, getPipeline, refreshAll } from "./lib/notion.js";
import { streamChat } from "./lib/chat.js";
import {
  findByEmail,
  findById,
  verifyPassword,
  publicUser,
  signToken,
  verifyToken,
  updateAccount,
} from "./auth.js";

const app = express();

// ---- CORS ----------------------------------------------------------------
// In development we allow localhost on any port.
// In production we lock down to the explicit list in ALLOWED_ORIGINS.
// Set ALLOWED_ORIGINS in your hosting provider as a comma-separated list,
// e.g.  https://avsinvest.co.uk,https://www.avsinvest.co.uk,https://app.avsinvest.co.uk
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || DEFAULT_DEV_ORIGINS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow tools like curl / Postman / server-to-server (no Origin header).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

console.log(`CORS allowing origins: ${allowedOrigins.join(", ")}`);

app.get("/", (req, res) => {
  res.send("AVS Invest API is running!");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

// ---- AUTH (real per-user passwords, shared by all dashboards) -------------
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  return res.json({ token: signToken(user.id), user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const id = verifyToken(token);
  const user = id ? findById(id) : null;
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.json({ user: publicUser(user) });
});

app.post("/api/auth/update-account", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const id = verifyToken(token);
  if (!id) return res.status(401).json({ error: "Not authenticated." });
  const { currentPassword, newEmail, newPassword } = req.body || {};
  const result = updateAccount(id, currentPassword, { newEmail, newPassword });
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ ok: true, user: result.user });
});

app.get("/api/properties", (req, res) => {
  res.json({ count: properties.length, properties });
});

app.get("/api/properties/:id", (req, res) => {
  const property = properties.find((p) => p.id === req.params.id);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }
  res.json(property);
});

app.get("/api/summary", (req, res) => {
  const active = properties.filter((p) => p.status === "Active");
  const totalIncome = active.reduce((s, p) => s + p.monthlyIncome, 0);
  const avgRoi = active.length === 0
    ? 0
    : active.reduce((s, p) => s + p.roi, 0) / active.length;
  const avgOccupancy = active.length === 0
    ? 0
    : active.reduce((s, p) => s + p.occupancy, 0) / active.length;
  const totalValue = properties.reduce((s, p) => s + p.estimatedValue, 0);

  res.json({
    workspace: "AVS Invest",
    propertyCount: properties.length,
    activeCount: active.length,
    monthlyIncome: totalIncome,
    avgRoi: Math.round(avgRoi * 10) / 10,
    avgOccupancy: Math.round(avgOccupancy),
    totalValue,
    asOf: new Date().toISOString(),
  });
});

app.get("/api/notion/properties", async (req, res) => {
  try {
    const r = await getProperties();
    res.json({
      count: r.data.length,
      cached: r.cached,
      stale: r.stale || false,
      fetchedAt: new Date(r.fetchedAt).toISOString(),
      properties: r.data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/notion/pipeline", async (req, res) => {
  try {
    const r = await getPipeline();
    res.json({
      count: r.data.length,
      cached: r.cached,
      stale: r.stale || false,
      fetchedAt: new Date(r.fetchedAt).toISOString(),
      deals: r.data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/notion/refresh", (req, res) => {
  refreshAll();
  res.json({ ok: true, message: "Notion cache invalidated; next request refetches." });
});

// ---- AI Chat -------------------------------------------------------------
// Stream chat with the AVS assistant. Body: { messages: [{role, content}, ...] }.
// Emits Server-Sent Events: text chunks, tool calls, navigation suggestions, errors.
app.post("/api/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (type, data) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const { messages, attachments } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    send("error", { message: "messages array required" });
    res.end();
    return;
  }

  let aborted = false;
  // Use the RESPONSE close (client disconnected), NOT req close — in Express 5
  // req "close" fires once the request body is read, which would wrongly abort.
  res.on("close", () => {
    aborted = true;
  });

  try {
    await streamChat({
      messages,
      attachments,
      callbacks: {
        onText: (chunk) => !aborted && send("text", { delta: chunk }),
        onToolUseStart: (info) => !aborted && send("tool_use_start", info),
        onToolResult: (info) => !aborted && send("tool_result", info),
        onUsage: (usage) => !aborted && send("usage", usage),
        onError: (msg) => !aborted && send("error", { message: msg }),
      },
    });
    if (!aborted) send("done", {});
  } catch (err) {
    if (!aborted) send("error", { message: err.message });
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
