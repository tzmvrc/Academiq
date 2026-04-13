import jwt from "jsonwebtoken";
import { UserModel } from "../models/user_model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user data to include role
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
