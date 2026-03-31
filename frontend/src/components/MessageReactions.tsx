import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface Reaction {
  userId: string;
  reaction: string;
  userName?: string;
}

interface MessageReactionsProps {
  messageId: string;
  messageType: "global" | "dm";
  reactions: Reaction[];
  currentUserId: string;
  onReact: (
    messageId: string,
    messageType: string,
    reaction: string,
    action: "add" | "remove",
  ) => void;
  isOwnMessage: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  messageType,
  reactions,
  currentUserId,
  onReact,
  isOwnMessage,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Group reactions by emoji with user details
  const grouped: Record<string, { userId: string; userName?: string }[]> = {};
  reactions.forEach((r) => {
    if (!grouped[r.reaction]) grouped[r.reaction] = [];
    grouped[r.reaction].push({ userId: r.userId, userName: r.userName });
  });

  const hasReacted = (emoji: string) => {
    return grouped[emoji]?.some((u) => u.userId === currentUserId);
  };

  const handleReact = (emoji: string) => {
    if (hasReacted(emoji)) {
      onReact(messageId, messageType, emoji, "remove");
    } else {
      onReact(messageId, messageType, emoji, "add");
    }
    setShowPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex flex-wrap items-center gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
            users.some((u) => u.userId === currentUserId)
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
          } transition-colors`}
          title={users
            .map((u) =>
              u.userId === currentUserId ? "You" : u.userName || "Someone",
            )
            .join(", ")}>
          <span>{emoji}</span>
          <span>{users.length}</span>
        </button>
      ))}

      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          ref={buttonRef}
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 text-muted-foreground hover:bg-secondary transition-colors">
          <Smile className="h-3 w-3" />
        </button>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute bottom-full mb-2 p-2 bg-card border border-border rounded-xl shadow-lg flex gap-1 z-10 ${
                isOwnMessage ? "right-0" : "left-0"
              }`}>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xl hover:bg-secondary p-1 rounded transition-colors">
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessageReactions;
