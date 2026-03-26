// socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

let io;

export const initSocket = (server) => {
  console.log("Initialising Socket.IO...");
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:8080",
      credentials: true,
    },
  });

  // Authenticate socket connection using JWT from handshake
  io.use((socket, next) => {
    console.log("Handshake auth:", socket.handshake.auth);

    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ No token received");
      return next(new Error("Authentication error"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log("❌ Invalid token");
        return next(new Error("Authentication error"));
      }

      console.log("✅ Auth success:", decoded);

      socket.userId = decoded.userId || decoded.id;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    // Join room for a specific post
    socket.on("join_post_room", (postId) => {
      socket.join(`post:${postId}`);
    });

    // Leave room
    socket.on("leave_post_room", (postId) => {
      socket.leave(`post:${postId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.userId);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};
