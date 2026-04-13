import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Phone, Video, Info } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  createdAt: string;
  reactions?: Array<{ emoji: string; count: number }>;
}

interface ConversationDetailProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string | null;
  messages: Message[];
  currentUserId: string;
  loading?: boolean;
  onSendMessage: (content: string) => void;
  onBack: () => void;
  onShowInfo?: () => void;
  onReaction?: (
    messageId: string,
    emoji: string,
    action: "add" | "remove",
  ) => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  participantName,
  participantAvatar,
  messages,
  currentUserId,
  loading = false,
  onSendMessage,
  onBack,
  onShowInfo,
  onCall,
  onVideoCall,
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
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary rounded-lg transition-colors md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary overflow-hidden">
            {participantAvatar ? (
              <img
                src={participantAvatar}
                alt={participantName}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(participantName)
            )}
          </div>
          <h2 className="font-semibold text-foreground">{participantName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCall}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Call">
            <Phone className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={onVideoCall}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Video call">
            <Video className="h-5 w-5 text-muted-foreground" />
          </button>
          {onShowInfo && (
            <button
              onClick={onShowInfo}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Conversation info">
              <Info className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
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
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const showAvatar =
                index === 0 ||
                messages[index - 1]?.senderId !== message.senderId;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isCurrentUser ? "justify-end" : ""}`}>
                  {!isCurrentUser && showAvatar && (
                    <div className="h-8 w-8 bg-primary/10 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden">
                      {message.senderAvatar ? (
                        <img
                          src={message.senderAvatar}
                          alt={message.senderName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        message.senderName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                      )}
                    </div>
                  )}
                  {!isCurrentUser && !showAvatar && <div className="w-8" />}

                  <div
                    className={`max-w-xs ${isCurrentUser ? "md:max-w-md" : ""}`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-secondary text-foreground rounded-bl-none"
                      }`}>
                      <p className="text-sm break-all">{message.content}</p>
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
            placeholder="Type a message..."
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

export default ConversationDetail;
