import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Send, MessageSquare, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isGroup?: boolean;
  memberCount?: number;
}

interface ConversationInboxProps {
  conversations: Conversation[];
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  selectedConversationId?: string | null;
  loading?: boolean;
  onGlobalChat?: () => void;
}

export const ConversationInbox: React.FC<ConversationInboxProps> = ({
  conversations,
  onConversationSelect,
  onNewConversation,
  selectedConversationId,
  loading = false,
  onGlobalChat,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredConversations, setFilteredConversations] =
    useState<Conversation[]>(conversations);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredConversations(
        conversations.filter((conv) =>
          conv.participantName.toLowerCase().includes(term),
        ),
      );
    }
  }, [searchTerm, conversations]);

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return "";
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

  const truncateMessage = (message: string, maxLength: number = 40) => {
    return message.length > maxLength
      ? message.slice(0, maxLength) + "..."
      : message;
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Messages
          </h2>
          <button
            onClick={onNewConversation}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Start new conversation">
            <Send className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Global Chat Option */}
      {onGlobalChat && (
        <button
          onClick={onGlobalChat}
          className="mx-4 mt-3 flex items-center gap-3 rounded-lg border-2 border-dashed border-primary/30 p-3 transition-colors hover:border-primary/60 hover:bg-primary/5 text-sm text-muted-foreground hover:text-primary">
          <Users className="h-5 w-5" />
          <span>Open Community Chat</span>
        </button>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
            <MessageSquare className="h-12 w-12 opacity-20 mb-2" />
            <p className="text-sm">
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <motion.button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all ${
                  selectedConversationId === conversation.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary border border-transparent"
                }`}>
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary overflow-hidden">
                    {conversation.participantAvatar ? (
                      <img
                        src={conversation.participantAvatar}
                        alt={conversation.participantName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(conversation.participantName)
                    )}
                  </div>
                  {/* Unread badge */}
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {Math.min(conversation.unreadCount, 9)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-sm">
                    {conversation.participantName}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.lastMessage
                      ? truncateMessage(conversation.lastMessage)
                      : "No messages yet"}
                  </p>
                </div>

                {/* Time */}
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatTime(conversation.lastMessageTime)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationInbox;
