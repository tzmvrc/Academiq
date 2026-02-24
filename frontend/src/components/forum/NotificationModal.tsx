import React from "react";
import { X, ThumbsUp, Trophy, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "upvote" | "points" | "rank" | "ai";
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

const notificationStyles = {
  upvote: {
    icon: ThumbsUp,
    bgColor: "bg-teal/20",
    borderColor: "border-teal",
    iconBg: "bg-teal",
  },
  points: {
    icon: TrendingUp,
    bgColor: "bg-mint/20",
    borderColor: "border-mint",
    iconBg: "bg-mint",
  },
  rank: {
    icon: Trophy,
    bgColor: "bg-yellow/20",
    borderColor: "border-yellow",
    iconBg: "bg-yellow",
  },
  ai: {
    icon: Sparkles,
    bgColor: "bg-blue/20",
    borderColor: "border-blue",
    iconBg: "bg-blue",
  },
};

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border-[4px] border-foreground rounded-xl shadow-brutal-lg w-full max-w-md max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between border-b-[4px] border-foreground">
          <h2 className="text-xl font-bold text-primary-foreground">
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const style = notificationStyles[notification.type];
              const Icon = style.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 rounded-lg border-[3px] border-foreground shadow-brutal-sm",
                    style.bgColor,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg border-[2px] border-foreground flex items-center justify-center flex-shrink-0",
                        style.iconBg,
                      )}
                    >
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {notification.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
