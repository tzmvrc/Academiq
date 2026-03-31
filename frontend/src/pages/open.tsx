import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Hash,
  MessageSquare,
  Users,
  ChevronRight,
  Lock,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSocket } from "@/components/SocketContext";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";
import MessageReactions from "../components/MessageReactions";

// ========== Helper functions (unchanged) ==========
const getInitials = (name) => {
  if (!name) return "UN";
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const formatElapsedTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString();
};

const getUserFromStorage = () => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      return {
        id: u.id,
        name: u.name,
        initials: getInitials(u.name),
        profileUrl: u.profile_url,
      };
    }
  } catch (e) {}
  return null;
};

// ========== Main SecretChat Component ==========
const SecretChat = () => {
  const { socket } = useSocket();

  const [currentUser, setCurrentUser] = useState(() => getUserFromStorage());
  const [isLoading, setIsLoading] = useState(true); // manual loading state
  const [activeTab, setActiveTab] = useState("global");
  const [activeConv, setActiveConv] = useState(null);
  const [messageInput, setMessageInput] = useState("");

  const [globalMessages, setGlobalMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [reactionPreviews, setReactionPreviews] = useState({});

  const [globalReactions, setGlobalReactions] = useState({});
  const [dmReactions, setDmReactions] = useState({});

  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const globalMessagesEndRef = useRef(null);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers;
    const q = userSearchQuery.toLowerCase();
    return allUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [allUsers, userSearchQuery]);

  // ========== Manual loading timeout ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // adjust duration as needed (1000ms = 1 sec)
    return () => clearTimeout(timer);
  }, []);

  // Listen for user changes across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUser(getUserFromStorage());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (activeTab === "global" && globalMessagesEndRef.current) {
      setTimeout(() => {
        globalMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [globalMessages, activeTab]);

  useEffect(() => {
    if (activeTab === "dm" && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [dmMessages, activeTab]);

  // Focus search input when opened
  useEffect(() => {
    if (showUserSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showUserSearch]);

  // Auto-select most recent DM when switching to DM tab
  useEffect(() => {
    if (activeTab === "dm" && conversations.length > 0 && !activeConv) {
      const mostRecent = conversations[0];
      setActiveConv(mostRecent);
    }
  }, [activeTab, conversations, activeConv]);

  // ---------- API calls (unchanged) ----------
  const fetchGlobalMessages = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await axiosInstance.get("/open/global-messages");
      const formatted = data.messages.map((msg) => ({
        id: msg.id,
        user: msg.users.name,
        userId: msg.users.id,
        initials: getInitials(msg.users.name),
        profileUrl: msg.users.profile_url,
        text: msg.content,
        time: formatElapsedTime(msg.created_at),
        createdAt: msg.created_at,
        reactions: msg.reactions || [],
      }));
      const unique = formatted.filter(
        (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index,
      );
      setGlobalMessages(unique);
      const reactionsMap = {};
      unique.forEach((msg) => {
        if (msg.reactions?.length) {
          reactionsMap[msg.id] = msg.reactions;
        }
      });
      setGlobalReactions(reactionsMap);
    } catch (err) {
      console.error("Failed to fetch global messages:", err);
      toast({ title: "Failed to load global chat", variant: "destructive" });
    }
  }, [currentUser]);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await axiosInstance.get("/open/dm-conversations");
      const sorted = [...data.conversations].sort(
        (a, b) =>
          new Date(b.last_msg_time || 0) - new Date(a.last_msg_time || 0),
      );
      setConversations(sorted);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentUser]);

  const fetchAllUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await axiosInstance.get("/auth/users");
      const filtered = data.users.filter((u) => u.id !== currentUser.id);
      const unique = filtered.filter(
        (user, index, self) =>
          self.findIndex((u) => u.id === user.id) === index,
      );
      setAllUsers(unique);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, [currentUser]);

  const fetchDmMessages = useCallback(async (conversationId) => {
    try {
      const { data } = await axiosInstance.get(
        `/open/dm-messages/${conversationId}`,
      );
      const formatted = data.messages.map((msg) => ({
        id: msg.id,
        user: msg.sender.name,
        userId: msg.sender.id,
        initials: getInitials(msg.sender.name),
        profileUrl: msg.sender.profile_url,
        text: msg.content,
        time: formatElapsedTime(msg.created_at),
        createdAt: msg.created_at,
        reactions: msg.reactions || [],
      }));
      const unique = formatted.filter(
        (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index,
      );
      setDmMessages(unique);
      const reactionsMap = {};
      unique.forEach((msg) => {
        if (msg.reactions?.length) {
          reactionsMap[msg.id] = msg.reactions;
        }
      });
      setDmReactions(reactionsMap);
    } catch (err) {
      console.error("Failed to fetch DM messages:", err);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchGlobalMessages();
    fetchConversations();
    fetchAllUsers();
  }, [currentUser, fetchGlobalMessages, fetchConversations, fetchAllUsers]);

  // ---------- Socket events (unchanged) ----------
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.emit("join_global");

    const onGlobalMessage = (msg) => {
      const formatted = {
        id: msg.id,
        user: msg.users.name,
        userId: msg.users.id,
        initials: getInitials(msg.users.name),
        profileUrl: msg.users.profile_url,
        text: msg.content,
        time: formatElapsedTime(msg.created_at),
        createdAt: msg.created_at,
        reactions: [],
      };
      setGlobalMessages((prev) => {
        if (prev.some((m) => m.id === formatted.id)) return prev;
        return [...prev, formatted];
      });
    };

    const onDmMessage = (msg) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === msg.conversation_id
            ? {
                ...c,
                last_msg: msg.content,
                last_msg_time: msg.created_at,
                last_msg_sender_id: msg.sender.id,
              }
            : c,
        );
        return updated.sort(
          (a, b) =>
            new Date(b.last_msg_time || 0) - new Date(a.last_msg_time || 0),
        );
      });

      if (activeConv?.id !== msg.conversation_id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
        }));
      } else {
        setUnreadCounts((prev) => {
          const newCounts = { ...prev };
          delete newCounts[msg.conversation_id];
          return newCounts;
        });
        const formatted = {
          id: msg.id,
          user: msg.sender.name,
          userId: msg.sender.id,
          initials: getInitials(msg.sender.name),
          profileUrl: msg.sender.profile_url,
          text: msg.content,
          time: formatElapsedTime(msg.created_at),
          createdAt: msg.created_at,
          reactions: [],
        };
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === formatted.id)) return prev;
          return [...prev, formatted];
        });
      }
    };

    const onUserStatus = ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (status === "online") newSet.add(userId);
        else newSet.delete(userId);
        return newSet;
      });
    };

    const onOnlineUsersList = (userIds) => {
      setOnlineUsers(new Set(userIds));
    };

    const onReactionAdded = ({
      messageId,
      messageType,
      userId,
      reaction,
      userName,
      conversationId,
    }) => {
      const newReaction = { userId, reaction, userName };
      if (messageType === "global") {
        setGlobalReactions((prev) => {
          const existing = prev[messageId] || [];
          if (
            existing.some((r) => r.userId === userId && r.reaction === reaction)
          )
            return prev;
          return { ...prev, [messageId]: [...existing, newReaction] };
        });
      } else {
        setDmReactions((prev) => {
          const existing = prev[messageId] || [];
          if (
            existing.some((r) => r.userId === userId && r.reaction === reaction)
          )
            return prev;
          return { ...prev, [messageId]: [...existing, newReaction] };
        });

        if (conversationId && activeConv?.id !== conversationId) {
          setReactionPreviews((prev) => ({
            ...prev,
            [conversationId]: { emoji: reaction, userName },
          }));
        }
      }
    };

    const onReactionRemoved = ({
      messageId,
      messageType,
      userId,
      reaction,
      conversationId,
    }) => {
      if (messageType === "global") {
        setGlobalReactions((prev) => {
          const existing = prev[messageId] || [];
          const filtered = existing.filter(
            (r) => !(r.userId === userId && r.reaction === reaction),
          );
          if (filtered.length === 0) {
            const { [messageId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [messageId]: filtered };
        });
      } else {
        setDmReactions((prev) => {
          const existing = prev[messageId] || [];
          const filtered = existing.filter(
            (r) => !(r.userId === userId && r.reaction === reaction),
          );
          if (filtered.length === 0) {
            const { [messageId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [messageId]: filtered };
        });

        if (
          conversationId &&
          reactionPreviews[conversationId]?.emoji === reaction
        ) {
          setReactionPreviews((prev) => {
            const newPreviews = { ...prev };
            delete newPreviews[conversationId];
            return newPreviews;
          });
        }
      }
    };

    const onGlobalChatCleared = () => {
      setGlobalMessages([]);
      setGlobalReactions({});
      toast({
        title: "Global chat reset",
        description: "All messages have been cleared at midnight.",
        variant: "default",
      });
    };

    socket.on("global_message", onGlobalMessage);
    socket.on("dm_message", onDmMessage);
    socket.on("user_status", onUserStatus);
    socket.on("online_users_list", onOnlineUsersList);
    socket.on("reaction_added", onReactionAdded);
    socket.on("reaction_removed", onReactionRemoved);
    socket.on("global_chat_cleared", onGlobalChatCleared);

    return () => {
      socket.off("global_message", onGlobalMessage);
      socket.off("dm_message", onDmMessage);
      socket.off("user_status", onUserStatus);
      socket.off("online_users_list", onOnlineUsersList);
      socket.off("reaction_added", onReactionAdded);
      socket.off("reaction_removed", onReactionRemoved);
      socket.off("global_chat_cleared", onGlobalChatCleared);
      socket.emit("leave_global");
    };
  }, [socket, currentUser, activeConv, reactionPreviews]);

  // Join DM room when active conversation changes
  useEffect(() => {
    if (!socket || !activeConv) return;
    socket.emit("join_dm", activeConv.id);

    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[activeConv.id];
      return newCounts;
    });
    setReactionPreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[activeConv.id];
      return newPreviews;
    });

    return () => {
      socket.emit("leave_dm", activeConv.id);
    };
  }, [socket, activeConv]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConv) {
      setDmMessages([]);
      setDmReactions({});
      return;
    }
    fetchDmMessages(activeConv.id);
  }, [activeConv, fetchDmMessages]);

  // Handlers
  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    if (activeTab === "global") {
      try {
        await axiosInstance.post("/open/global-messages", {
          content: messageInput.trim(),
        });
        setMessageInput("");
      } catch (err) {
        console.error("Failed to send global message:", err);
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    } else if (activeConv) {
      const content = messageInput.trim();
      try {
        await axiosInstance.post("/open/dm-messages", {
          conversationId: activeConv.id,
          content,
          recipientId: activeConv.other_user.id,
        });
        setMessageInput("");
      } catch (err) {
        console.error("Failed to send DM:", err);
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    }
  };

  const handleReaction = async (messageId, messageType, reaction, action) => {
    try {
      if (action === "add") {
        await axiosInstance.post("/open/reactions", {
          messageId,
          messageType,
          reaction,
        });
      } else {
        await axiosInstance.delete("/open/reactions", {
          data: { messageId, messageType, reaction },
        });
      }
    } catch (err) {
      console.error("Reaction error:", err);
      toast({ title: "Failed to update reaction", variant: "destructive" });
    }
  };

  const startNewDM = async (user) => {
    try {
      const { data } = await axiosInstance.post("/open/dm-conversations", {
        userId: user.id,
      });
      const newConv = data.conversation;
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
      setActiveConv(newConv);
      setShowUserSearch(false);
      setUserSearchQuery("");
    } catch (err) {
      console.error("Failed to start DM:", err);
      toast({ title: "Failed to start conversation", variant: "destructive" });
    }
  };

  const formatLastMsg = (conv, currentUserId) => {
    if (!conv.last_msg) return "No messages yet";
    if (conv.last_msg_sender_id === currentUserId) {
      return `You: ${conv.last_msg.substring(0, 50)}${conv.last_msg.length > 50 ? "..." : ""}`;
    }
    return (
      conv.last_msg.substring(0, 50) + (conv.last_msg.length > 50 ? "..." : "")
    );
  };

  // ========== Skeleton Loader ==========
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-accent/20 animate-pulse" />
            <div>
              <div className="h-5 w-32 bg-accent/20 rounded animate-pulse mb-1" />
              <div className="h-3 w-48 bg-accent/20 rounded animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-200px)]">
            {/* Sidebar skeleton */}
            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="flex border-b border-border">
                <div className="flex-1 h-10 bg-secondary/20 animate-pulse" />
                <div className="flex-1 h-10 bg-secondary/20 animate-pulse" />
              </div>
              <div className="p-2 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-primary/10 rounded animate-pulse mb-1" />
                      <div className="h-2 w-32 bg-primary/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat area skeleton */}
            <div className="rounded-xl border border-border bg-card flex flex-col">
              <div className="px-5 py-3 border-b border-border">
                <div className="h-5 w-32 bg-accent/20 rounded animate-pulse" />
              </div>
              <div className="flex-1 p-5 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-primary/10 rounded animate-pulse mb-1" />
                      <div className="h-12 w-48 bg-secondary/50 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <div className="h-9 w-full bg-secondary/30 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== Actual Chat UI (unchanged except for removal of boot logic) ==========
  const currentDMUser = activeConv?.other_user;
  const currentMessages = activeTab === "global" ? globalMessages : dmMessages;
  const currentReactions =
    activeTab === "global" ? globalReactions : dmReactions;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Lock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground">
              Open forum
            </h1>
            <p className="text-xs text-muted-foreground">
              Connect with the academic community in real-time
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-200px)]">
          {/* Sidebar (unchanged) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex border-b border-border">
              <button
                onClick={() => {
                  setActiveTab("global");
                  setActiveConv(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
                  activeTab === "global"
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <Hash className="h-3.5 w-3.5" /> Global
              </button>
              <button
                onClick={() => setActiveTab("dm")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
                  activeTab === "dm"
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <Users className="h-3.5 w-3.5" /> Direct
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "global" ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">
                  <Hash className="h-3.5 w-3.5 text-accent" /> general
                </div>
              ) : showUserSearch ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search by name..."
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowUserSearch(false);
                        setUserSearchQuery("");
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startNewDM(user)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
                        <div className="relative shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {user.profile_url ? (
                              <img
                                src={user.profile_url}
                                alt={user.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-semibold text-primary">
                                {getInitials(user.name)}
                              </span>
                            )}
                          </div>
                          {onlineUsers.has(user.id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {user.school || "No school"}
                          </p>
                        </div>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-4">
                        No users found
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowUserSearch(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors mb-1">
                    <Plus className="h-3.5 w-3.5" /> New Message
                  </button>
                  {conversations.map((conv) => {
                    const otherUser = conv.other_user;
                    if (!otherUser) return null;
                    const isOnline = onlineUsers.has(otherUser.id);
                    const unreadCount = unreadCounts[conv.id] || 0;
                    const reactionPreview = reactionPreviews[conv.id];
                    const lastMsgPreview = formatLastMsg(conv, currentUser?.id);
                    const previewText =
                      reactionPreview && !unreadCount
                        ? `${reactionPreview.userName} reacted with ${reactionPreview.emoji}`
                        : lastMsgPreview;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          activeConv?.id === conv.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        }`}>
                        <div className="relative shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {otherUser.profile_url ? (
                              <img
                                src={otherUser.profile_url}
                                alt={otherUser.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-semibold text-primary">
                                {getInitials(otherUser.name)}
                              </span>
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center">
                            <p
                              className={`text-xs font-medium truncate ${
                                unreadCount > 0
                                  ? "font-bold text-foreground"
                                  : ""
                              }`}>
                              {otherUser.name}
                            </p>
                            {unreadCount > 0 && (
                              <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10px] truncate ${
                              unreadCount > 0
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}>
                            {previewText}
                          </p>
                          {reactionPreview && unreadCount === 0 && (
                            <div className="text-[9px] text-accent mt-0.5">
                              {reactionPreview.emoji} new reaction
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Chat area (unchanged) */}
          <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              {activeTab === "global" ? (
                <>
                  <Hash className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">
                    general
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Global academic chat
                  </span>
                </>
              ) : activeConv && currentDMUser ? (
                <>
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {currentDMUser.profile_url ? (
                      <img
                        src={currentDMUser.profile_url}
                        alt={currentDMUser.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-primary">
                        {getInitials(currentDMUser.name)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {currentDMUser.name}
                  </span>
                  {onlineUsers.has(currentDMUser.id) && (
                    <span className="text-[10px] text-success font-medium">
                      Online
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Select a conversation
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === "dm" && !activeConv ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Select a user to start chatting
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === "global" && globalMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                      <p>No messages yet. Be the first to say something!</p>
                    </div>
                  )}
                  {activeTab === "dm" &&
                    currentMessages.length === 0 &&
                    activeConv && (
                      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <p>Send a message to start the conversation</p>
                      </div>
                    )}
                  {currentMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 group ${
                        msg.userId === currentUser?.id ? "flex-row-reverse" : ""
                      }`}>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {msg.profileUrl ? (
                          <img
                            src={msg.profileUrl}
                            alt={msg.user}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-primary">
                            {msg.initials}
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[70%] ${
                          msg.userId === currentUser?.id ? "text-right" : ""
                        }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.userId !== currentUser?.id && (
                            <span className="text-xs font-medium text-foreground">
                              {msg.user}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {msg.time}
                          </span>
                        </div>
                        <div
                          className={`inline-block rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.userId === currentUser?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}>
                          {msg.text}
                        </div>

                        <MessageReactions
                          messageId={msg.id}
                          messageType={activeTab === "global" ? "global" : "dm"}
                          reactions={currentReactions[msg.id] || []}
                          currentUserId={currentUser?.id}
                          onReact={handleReaction}
                          isOwnMessage={msg.userId === currentUser?.id}
                        />
                      </div>
                    </motion.div>
                  ))}
                  <div
                    ref={
                      activeTab === "global"
                        ? globalMessagesEndRef
                        : messagesEndRef
                    }
                  />
                </>
              )}
            </div>

            {(activeTab === "global" || activeConv) && (
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={`Message ${
                      activeTab === "global"
                        ? "#general"
                        : currentDMUser?.name || ""
                    }...`}
                    className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
                  />
                  <button
                    onClick={sendMessage}
                    className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SecretChat;
