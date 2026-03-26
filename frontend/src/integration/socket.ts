// src/integration/socket.ts
import { io, Socket } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => console.log("Socket connected"));
    socket.on("disconnect", (reason) =>
      console.log("Socket disconnected:", reason),
    );
    socket.on("connect_error", (err) =>
      console.error("Socket connection error:", err.message),
    );
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
