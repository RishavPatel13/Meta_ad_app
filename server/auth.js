import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.AIRTABLE_PAT ||
    "meta-ad-desk-dev-secret"
  );
}

function users() {
  return [
    {
      username: process.env.AUTH_USERNAME || "Admin",
      password: process.env.AUTH_PASSWORD || "Meta@ad123",
      role: "admin",
      active: true,
    },
  ];
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto
    .createHmac("sha256", secret())
    .update(body)
    .digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function findUser(username, password) {
  const user = users().find(
    (item) => item.username.toLowerCase() === String(username || "").trim().toLowerCase()
  );
  if (!user || !user.active) return null;
  if (!safeEqual(user.password, String(password || ""))) return null;
  return user;
}

function login(username, password) {
  const user = findUser(username, password);
  if (!user) {
    throw Object.assign(new Error("Invalid username or password"), { status: 401 });
  }
  const token = signToken({
    u: user.username,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  return { token, user: { username: user.username, role: user.role } };
}

function readBearer(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function requireAuth(req, res, next) {
  const publicPaths = ["/health", "/auth/login"];
  if (publicPaths.includes(req.path)) {
    next();
    return;
  }
  const payload = verifyToken(readBearer(req));
  if (!payload) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  req.user = { username: payload.u, role: payload.role };
  next();
}

export { login, requireAuth, verifyToken, readBearer };
