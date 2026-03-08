import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Hash, MessageSquare, Users, ChevronRight, Lock } from "lucide-react";

const bootLines = [
  "> Initializing secure connection...",
  "> Authenticating credentials... OK",
  "> Loading encrypted channels...",
  "> Establishing peer-to-peer bridge...",
  "> Decrypting message store... OK",
  "> Mounting Academiq Secret Chat Module",
  "> Access granted. Welcome back.",
];

const globalMessages = [
  { id: 1, user: "Dr. Emily Zhang", initials: "EZ", text: "Has anyone looked into the new SSM benchmarks?", time: "2:34 PM" },
  { id: 2, user: "Lina Kovacs", initials: "LK", text: "Yeah, Mamba-2 results are interesting. The throughput gains are real.", time: "2:36 PM" },
  { id: 3, user: "Prof. Michael Torres", initials: "MT", text: "We should organize a reading group for the ICML papers.", time: "2:41 PM" },
  { id: 4, user: "Dr. Anika Patel", initials: "AP", text: "Count me in. Quantum error correction track looks promising this year.", time: "2:43 PM" },
];

const dmUsers = [
  { name: "Dr. Emily Zhang", initials: "EZ", lastMsg: "Sure, I'll send the paper link.", online: true },
  { name: "Lina Kovacs", initials: "LK", lastMsg: "Thanks for the feedback!", online: true },
  { name: "Prof. Michael Torres", initials: "MT", lastMsg: "See you at the seminar.", online: false },
  { name: "Dr. Anika Patel", initials: "AP", lastMsg: "The proof is in section 4.2.", online: true },
];

const SecretChat = () => {
  const [booted, setBooted] = useState(false);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"global" | "dm">("global");
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState(globalMessages);
  const [dmMessages, setDmMessages] = useState<Record<string, typeof globalMessages>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Boot sequence
  useEffect(() => {
    if (booted) return;
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= bootLines.length) {
          clearInterval(interval);
          setTimeout(() => setBooted(true), 600);
          return prev;
        }
        return prev + 1;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [booted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages, activeDM]);

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const newMsg = {
      id: Date.now(),
      user: "You",
      initials: "AK",
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    if (activeTab === "global") {
      setMessages((prev) => [...prev, newMsg]);
    } else if (activeDM) {
      setDmMessages((prev) => ({
        ...prev,
        [activeDM]: [...(prev[activeDM] || []), newMsg],
      }));
    }
    setMessageInput("");
  };

  // Boot animation screen
  if (!booted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-xl"
        >
          <div className="rounded-xl border border-border bg-card p-8 font-mono text-sm">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-4 w-4 text-accent" />
              <span className="text-accent font-semibold tracking-wide text-xs uppercase">Academiq Secure Channel</span>
            </div>
            <div className="space-y-2">
              {bootLines.slice(0, visibleLines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${
                    line.includes("OK") || line.includes("granted")
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {line}
                </motion.div>
              ))}
              {visibleLines < bootLines.length && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="inline-block w-2 h-4 bg-foreground"
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentDMUser = dmUsers.find((u) => u.name === activeDM);
  const currentMessages = activeTab === "global" ? messages : (activeDM ? dmMessages[activeDM] || [] : []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Lock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground">Secret Chat</h1>
            <p className="text-xs text-muted-foreground">Encrypted academic channel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setActiveTab("global"); setActiveDM(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
                  activeTab === "global" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Hash className="h-3.5 w-3.5" />
                Global
              </button>
              <button
                onClick={() => setActiveTab("dm")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
                  activeTab === "dm" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Direct
              </button>
            </div>

            {/* Channel / DM list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "global" ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">
                  <Hash className="h-3.5 w-3.5 text-accent" />
                  general
                </div>
              ) : (
                dmUsers.map((user) => (
                  <button
                    key={user.name}
                    onClick={() => setActiveDM(user.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeDM === user.name ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-primary">{user.initials}</span>
                      </div>
                      {user.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.lastMsg}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              {activeTab === "global" ? (
                <>
                  <Hash className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">general</span>
                  <span className="text-xs text-muted-foreground ml-2">Global academic chat</span>
                </>
              ) : activeDM && currentDMUser ? (
                <>
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary">{currentDMUser.initials}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{currentDMUser.name}</span>
                  {currentDMUser.online && (
                    <span className="text-[10px] text-success font-medium">Online</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select a conversation</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(activeTab === "dm" && !activeDM) ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Select a user to start chatting</p>
                  </div>
                </div>
              ) : (
                <>
                  {currentMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.user === "You" ? "flex-row-reverse" : ""}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold text-primary">{msg.initials}</span>
                      </div>
                      <div className={`max-w-[70%] ${msg.user === "You" ? "text-right" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.user !== "You" && <span className="text-xs font-medium text-foreground">{msg.user}</span>}
                          <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                        </div>
                        <div className={`inline-block rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.user === "You"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {(activeTab === "global" || activeDM) && (
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={`Message ${activeTab === "global" ? "#general" : currentDMUser?.name || ""}...`}
                    className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
                  />
                  <button
                    onClick={sendMessage}
                    className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
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
