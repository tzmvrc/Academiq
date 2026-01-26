import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // attach user info to request
    req.user = decoded; // { userId: ... }

    next(); // allow access

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
