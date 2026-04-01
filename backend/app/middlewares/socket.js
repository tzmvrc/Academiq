import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

let io;
const onlineUsers = new Set();

export const initSocket = (server) => {
  console.log("Initialising Socket.IO...");
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:8080",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error"));
      socket.userId = decoded.userId || decoded.id;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.userId);
    onlineUsers.add(socket.userId);
    socket.join(`user:${socket.userId}`); // <-- join user's personal room

    // Send current online users list to the new client
    socket.emit("online_users_list", Array.from(onlineUsers));

    // Broadcast online status to all other clients
    socket.broadcast.emit("user_status", {
      userId: socket.userId,
      status: "online",
    });

    // --- Existing post rooms ---
    socket.on("join_post_room", (postId) => {
      socket.join(`post:${postId}`);
    });
    socket.on("leave_post_room", (postId) => {
      socket.leave(`post:${postId}`);
    });

    // --- Chat rooms ---
    socket.on("join_global", () => {
      socket.join("global");
    });
    socket.on("leave_global", () => {
      socket.leave("global");
    });
    socket.on("join_dm", (conversationId) => {
      socket.join(`dm:${conversationId}`);
    });
    socket.on("leave_dm", (conversationId) => {
      socket.leave(`dm:${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.userId);
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user_status", {
        userId: socket.userId,
        status: "offline",
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};
