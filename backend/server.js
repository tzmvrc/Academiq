import app from "./app/app.js";
import dotenv from "dotenv";
import http from "http";
import "./app/services/test/scheduler.js"; // after initSocket() is called
import { initSocket } from "./app/middlewares/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server); // attaches socket.io to the server

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful error handling for port conflicts
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is in use. Exiting. Please run: npx kill-port 5000`,
    );
    process.exit(1);
  }
});
