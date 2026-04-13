import React from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  className,
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30",
        "w-14 md:w-16 h-14 md:h-16",
        "rounded-full bg-primary text-primary-foreground",
        "shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "border-2 border-foreground",
        "hover:scale-110 transition-transform",
        "active:scale-95",
        className,
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      title="Create new post">
      <Plus className="w-6 h-6 md:w-7 md:h-7" strokeWidth={3} />
    </motion.button>
  );
};

export default FloatingActionButton;
