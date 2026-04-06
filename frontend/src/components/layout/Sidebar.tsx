import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance, { clearAuth } from "@/integration/axiosInstance";
import { cn } from "@/lib/utils";
import {
  User,
  Newspaper,
  Users,
  Trophy,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { BrutalButton } from "@/components/ui/BrutalButton";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNotificationsClick?: () => void;
  notificationCount?: number;
}

const navItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "peers", label: "Peers", icon: Users },
  { id: "leaderboards", label: "Leaderboards", icon: Trophy },
  { id: "interest", label: "Interest", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  activeTab,
  onTabChange,
  onNotificationsClick,
  notificationCount = 0,
}) => {
  // const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed:", err);
      // even if API fails, still clear local session
    } finally {
      clearAuth();
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      // Optional: if your clearAuth doesn’t navigate, you can do:
      // navigate("/", { replace: true });
    }
  };

  return (
    <>
      <aside
        className={cn(
          "h-screen sticky top-0 bg-sidebar border-r-[4px] border-foreground shadow-brutal flex flex-col transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
        )}>
        {/* Logo */}
        <div className="p-4 border-b-[3px] border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg border-[3px] border-foreground shadow-brutal-sm flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-foreground" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-sidebar-foreground">
                Academiq
              </span>
            )}
          </div>
        </div>

        {/* Notifications */}
        {onNotificationsClick && (
          <div className="px-4 pt-4">
            <button
              onClick={onNotificationsClick}
              className={cn(
                "relative w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all",
                "text-sidebar-foreground border-[2px] border-transparent",
                "hover:border-foreground hover:shadow-brutal-sm hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-2",
              )}>
              <Bell className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Notifications</span>}
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-coral text-foreground text-xs font-bold rounded-full flex items-center justify-center border-[2px] border-foreground">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all",
                  "border-[2px]",
                  isActive &&
                    "bg-secondary text-secondary-foreground shadow-brutal-sm border-foreground",
                  !isActive &&
                    "text-sidebar-foreground border-transparent hover:border-foreground hover:shadow-brutal-sm hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-2",
                )}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t-[3px] border-sidebar-border">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all",
              "text-sidebar-foreground border-[2px] border-transparent",
              "hover:border-foreground hover:shadow-brutal-sm hover:bg-destructive hover:text-destructive-foreground",
              isCollapsed && "justify-center px-2",
            )}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-secondary border-[3px] border-foreground rounded-full shadow-brutal-sm flex items-center justify-center hover:bg-yellow transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => !loggingOut && setShowLogoutConfirm(false)}
          />

          <div className="relative w-full max-w-md mx-4 bg-card border-[4px] border-foreground rounded-xl shadow-brutal-lg overflow-hidden">
            <div className="bg-primary p-4 flex items-center justify-between border-b-[4px] border-foreground">
              <h3 className="text-xl font-bold text-primary-foreground">
                Confirm Logout
              </h3>
              <button
                onClick={() => !loggingOut && setShowLogoutConfirm(false)}
                className="w-10 h-10 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="font-medium text-foreground">
                Are you sure you want to logout?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You’ll need to sign in again to continue.
              </p>
            </div>

            <div className="p-4 border-t-[3px] border-foreground bg-muted flex justify-end gap-3">
              <BrutalButton
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}>
                Cancel
              </BrutalButton>
              <BrutalButton
                variant="primary"
                onClick={handleLogout}
                disabled={loggingOut}>
                {loggingOut ? "Logging out..." : "Yes, Logout"}
              </BrutalButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
