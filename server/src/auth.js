const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const getAdminConfig = () => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin";
  return { username, password };
};

const verifyAdmin = async (username, password) => {
  const config = getAdminConfig();
  if (username !== config.username) {
    return false;
  }
  const stored = config.password;
  const isHash = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
  if (isHash) {
    return bcrypt.compare(password, stored);
  }
  return password === stored;
};

const createToken = (payload) => {
  const secret = process.env.JWT_SECRET || "change_me_super_secret";
  return jwt.sign(payload, secret, { expiresIn: "8h" });
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const secret = process.env.JWT_SECRET || "change_me_super_secret";
    const decoded = jwt.verify(token, secret);
    req.admin = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = {
  verifyAdmin,
  createToken,
  authMiddleware
};
