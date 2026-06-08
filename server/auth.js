// Real per-user authentication, shared by all dashboards (AVS :3000,
// Vertex :3001, Owner Hub :3002). Passwords are bcrypt-hashed; sessions are
// HMAC-signed tokens. Password changes persist to auth-store.json so they
// survive restarts. Set AUTH_SECRET in the server .env for production.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(__dirname, "auth-store.json");

const SECRET = process.env.AUTH_SECRET || "dev-avs-auth-secret-change-me-in-env";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Base users. `mustChange:true` forces a set-your-password popup on first login.
// Seed passwords are bcrypt-hashed (one-way) and replaced once the user sets their own.
const users = [
  { id: "U-1", name: "Craig Okungbowa",  email: "craig@avsinvest.co.uk",  role: "Owner", org: "AVS",
    passwordHash: "$2b$10$n4QrFpwwocy8ws8gY5.8AuA0m9HrNCxdHx6oPzlq/A7XmeyfFC2ta", mustChange: true },
  { id: "U-2", name: "Nathan Okungbowa", email: "contact@avsconsultation.com", role: "Admin", org: "AVS",
    passwordHash: "$2b$10$2I59VI/BjMRoLNvqhesFteJ13GgapTSjmzLzpKJiuhR5qbSXpnTcS", mustChange: true },
];

// ── Persistent overrides (password changes) ──
let store = {};
try {
  store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
} catch {
  store = {};
}
function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("[auth] could not write auth-store.json:", e.message);
  }
}

// Apply any stored override (changed email / password / mustChange) on top of the base user.
function effective(u) {
  if (!u) return null;
  const o = store[u.id] || {};
  return {
    ...u,
    email: o.email || u.email,
    passwordHash: o.passwordHash || u.passwordHash,
    mustChange: o.mustChange !== undefined ? o.mustChange : !!u.mustChange,
  };
}

export function findByEmail(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  const base = users.find((u) => effective(u).email.toLowerCase() === e);
  return effective(base);
}
export function findById(id) {
  return effective(users.find((u) => u.id === id));
}
export function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
function initialsOf(name) {
  return (name || "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
export function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, org: u.org,
    initials: initialsOf(u.name), mustChangePassword: !!u.mustChange,
  };
}

// Update a user's email and/or password (after verifying their current one). Persists.
export function updateAccount(userId, currentPassword, { newEmail, newPassword } = {}) {
  const u = findById(userId);
  if (!u) return { ok: false, error: "Account not found." };
  if (!verifyPassword(currentPassword, u.passwordHash)) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  const next = { ...(store[userId] || {}) };

  if (newEmail !== undefined && newEmail !== null && String(newEmail).trim() !== "") {
    const e = String(newEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { ok: false, error: "That email address doesn't look valid." };
    }
    const taken = users.some((x) => x.id !== userId && effective(x).email.toLowerCase() === e);
    if (taken) return { ok: false, error: "That email is already used by another account." };
    next.email = e;
  }

  if (newPassword !== undefined && newPassword !== null && String(newPassword) !== "") {
    if (String(newPassword).length < 8) {
      return { ok: false, error: "New password must be at least 8 characters." };
    }
    next.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  }

  next.mustChange = false;
  store[userId] = next;
  saveStore();
  return { ok: true, user: publicUser(findById(userId)) };
}

export function signToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ id: userId, exp: Date.now() + TOKEN_TTL_MS }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data.id;
  } catch {
    return null;
  }
}
