const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error(
    "[FATAL] JWT_SECRET belum diset atau kurang dari 16 karakter. " +
      "Generate acak: `node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"`"
  );
  process.exit(1);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Token tidak ada. Silakan login lagi." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sesi kadaluarsa atau tidak valid. Silakan login lagi." });
  }
}

module.exports = { signToken, requireAuth };
