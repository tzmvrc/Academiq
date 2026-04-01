import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocket, closeSocket } from "@/integration/socket";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("userToken"),
  );
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 🔁 Sync token across tabs
  useEffect(() => {
    const handleTokenChange = () => {
      setToken(localStorage.getItem("userToken"));
    };

    window.addEventListener("storage", handleTokenChange);
    window.addEventListener("userTokenChanged", handleTokenChange);

    return () => {
      window.removeEventListener("storage", handleTokenChange);
      window.removeEventListener("userTokenChanged", handleTokenChange);
    };
  }, []);

  // 🔌 Manage socket lifecycle
  useEffect(() => {
    // Always clean previous socket first
    closeSocket();
    setSocket(null);
    setIsConnected(false);

    if (!token) return;

    const newSocket = getSocket(token);

    // Connection listeners
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
