import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";

interface GlobalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  createdAt: string;
  reactions?: Array<{ emoji: string; count: number }>;
}

interface GlobalChatProps {
  messages: GlobalMessage[];
  currentUserId: string;
  currentUserName: string;
  loading?: boolean;
  onSendMessage: (content: string) => void;
  onBack: () => void;
  onReaction?: (
    messageId: string,
    emoji: string,
    action: "add" | "remove",
  ) => void;
}

export const GlobalChat: React.FC<GlobalChatProps> = ({
  messages,
  loading = false,
  onSendMessage,
  onBack,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput);
    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-3 bg-card">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="font-bold text-lg text-foreground">Community Chat</h2>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 text-sm text-muted-foreground">
        Public discussion • Everyone can see these messages
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-20 mb-2" />
              <p>No messages yet. Be the first to say something!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const showAvatar =
                index === 0 ||
                messages[index - 1]?.senderId !== message.senderId;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2">
                  {showAvatar && (
                    <div className="h-8 w-8 bg-primary/10 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden">
                      {message.senderAvatar ? (
                        <img
                          src={message.senderAvatar}
                          alt={message.senderName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(message.senderName)
                      )}
                    </div>
                  )}
                  {!showAvatar && <div className="w-8" />}

                  <div className="flex-1">
                    {showAvatar && (
                      <p className="text-xs font-semibold text-foreground mb-1">
                        {message.senderName}
                      </p>
                    )}
                    <div className="max-w-md bg-secondary rounded-lg px-3 py-2">
                      <p className="text-sm wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {formatTime(message.createdAt)}
                    </p>
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {message.reactions.map((reaction, i) => (
                          <div
                            key={i}
                            className="text-xs bg-secondary rounded-full px-2 py-0.5">
                            {reaction.emoji}{" "}
                            {reaction.count > 1 && reaction.count}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your thoughts..."
            rows={1}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            style={{
              maxHeight: "120px",
              minHeight: "40px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;
