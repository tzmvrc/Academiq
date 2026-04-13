import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance, { clearAuth } from "@/integration/axiosInstance";
import {
  Search,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import Icon from "@/components/ui/Icon.png";
import { useSocket } from "@/components/SocketContext";

interface User {
  id: string;
  email: string;
  name: string;
  profile_url: string | null;
  role: string;
  school: string | null;
}

interface Suggestion {
  type: "forum" | "user" | "subject" | "tag";
  text: string;
  id?: string;
}

const navTabs = [
  { label: "Feed", path: "/feed" },
  { label: "Peers", path: "/peers" },
  { label: "Leaderboards", path: "/leaderboards" },
  { label: "Interests", path: "/interests" },
];

type ThemeMode = "light" | "dark" | "system";

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Navbar = () => {
  const location = useLocation();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("academiq-theme") as ThemeMode) || "light";
  });
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // ----- Notification real‑time logic -----
  // Listen for new notifications via WebSocket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification: any) => {
      setUnreadCount((prev) => prev + 1);
      toast({
        title: "New notification",
        description: notification.message,
        duration: 5000,
        // action removed – clicking the toast or bell will navigate
      });
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, user, navigate]);

  // Join user room (back‑end already joins on connection, but safe to keep)
  useEffect(() => {
    if (socket && user) {
      socket.emit("join", user.id);
    }
  }, [socket, user]);

  // Fetch initial unread count once when user is loaded
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      try {
        const res = await axiosInstance.get("/notifications/unread-count");
        setUnreadCount(res.data.count);
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };
    if (user) fetchInitialUnreadCount();
  }, [user]);
  // ----- End notification logic -----

  useEffect(() => {
    const handleNotificationsRead = async () => {
      try {
        const res = await axiosInstance.get("/notifications/unread-count");
        setUnreadCount(res.data.count);
      } catch (err) {
        console.error("Failed to refresh unread count", err);
      }
    };
    window.addEventListener("notificationsRead", handleNotificationsRead);
    return () =>
      window.removeEventListener("notificationsRead", handleNotificationsRead);
  }, []);
  // Fetch suggestions when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await axiosInstance.get(
          `/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`,
        );
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      let token = localStorage.getItem("userToken");
      if (!token) token = localStorage.getItem("user");
      if (!token) token = localStorage.getItem("jwt");
      if (!token) {
        setUser(null);
        setLoadingUser(false);
        return;
      }
      try {
        const response = await axiosInstance.get("/auth/me");
        setUser(response.data);
      } catch (err: any) {
        console.error("Failed to fetch user:", err);
        if (err.response?.status === 401) {
          clearAuth();
        }
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("academiq-theme", theme);
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
    }
  }, [theme]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
        setThemeOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile search on route change
  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location.pathname]);

  // Clear search when "clear" event is triggered from search page
  useEffect(() => {
    const handleClearSearch = () => {
      setSearchQuery("");
    };
    window.addEventListener("clearNavbarSearch", handleClearSearch);
    return () =>
      window.removeEventListener("clearNavbarSearch", handleClearSearch);
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      clearAuth();
      setUser(null);
      setProfileOpen(false);
      navigate("/");
      toast({ title: "Logged out", description: "See you next time!" });
    }
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setThemeOpen(false);
    toast({
      title: `Theme: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      description: `Switched to ${mode} mode.`,
    });
  };

  const handleSearchSelect = (suggestion: Suggestion) => {
    setSearchQuery(suggestion.text);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    if (suggestion.type === "forum" && suggestion.id) {
      navigate(`/post/${suggestion.id}`);
    } else if (suggestion.type === "user" && suggestion.id) {
      navigate(`/profile/${encodeURIComponent(suggestion.text)}`);
    } else if (suggestion.type === "subject" && suggestion.id) {
      navigate(`/feed?subjectId=${suggestion.id}`);
    } else if (suggestion.type === "tag" && suggestion.id) {
      navigate(`/feed?tagId=${suggestion.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchFocused(false);
      setMobileSearchOpen(false);
    }
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  const getUserInitials = () => {
    if (!user || !user.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SuggestionsList = () => {
    if (loadingSuggestions) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          Searching...
        </div>
      );
    }
    if (suggestions.length === 0 && debouncedQuery.trim()) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          No suggestions found.
        </div>
      );
    }
    return (
      <>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSearchSelect(s);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-10 shrink-0">
              {s.type}
            </span>
            <span className="text-sm text-foreground truncate">{s.text}</span>
          </button>
        ))}
      </>
    );
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center px-4 sm:px-6 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src={Icon}
              alt="Academiq Logo"
              className="h-6 w-6 sm:h-8 sm:w-8"
            />
            <span className="text-lg sm:text-xl font-heading font-bold text-foreground tracking-tight">
              Academiq
            </span>
          </Link>

          {/* Center Tabs - Hidden on md, shown on desktop */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navTabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`relative px-3 lg:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-md bg-secondary"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.5,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
            {/* Desktop search */}
            <div
              ref={searchRef}
              className={`relative hidden sm:block transition-all duration-300 ${
                searchFocused ? "w-64 lg:w-72" : "w-40 lg:w-48"
              }`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-border bg-secondary/50 py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-body"
                onFocus={() => setSearchFocused(true)}
              />
              <AnimatePresence>
                {searchFocused &&
                  (suggestions.length > 0 || loadingSuggestions) && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                      <SuggestionsList />
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* Mobile search toggle */}
            <button
              className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications Bell with Unread Badge */}
            <Link
              to="/notifications"
              className="relative p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile / Login */}
            {!loadingUser && !user ? (
              <Link
                to="/auth"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Sign In
              </Link>
            ) : (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg p-1 sm:p-1.5 hover:bg-secondary transition-colors">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user?.profile_url ? (
                      <img
                        src={user.profile_url}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] sm:text-xs font-semibold text-primary">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground hidden sm:block transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                      {user && (
                        <>
                          <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                            {user.school && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.school}
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/${encodeURIComponent(user.name)}`}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            Profile
                          </Link>
                          <div className="h-px bg-border" />

                          {/* Theme Mode */}
                          <div className="relative">
                            <button
                              onClick={() => setThemeOpen(!themeOpen)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                              <span className="flex items-center gap-3">
                                <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                                Theme
                              </span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                                  themeOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            <AnimatePresence>
                              {themeOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden">
                                  {[
                                    {
                                      mode: "light" as ThemeMode,
                                      icon: Sun,
                                      label: "Light",
                                    },
                                    {
                                      mode: "dark" as ThemeMode,
                                      icon: Moon,
                                      label: "Dark",
                                    },
                                    {
                                      mode: "system" as ThemeMode,
                                      icon: Monitor,
                                      label: "System",
                                    },
                                  ].map((opt) => (
                                    <button
                                      key={opt.mode}
                                      onClick={() =>
                                        handleThemeChange(opt.mode)
                                      }
                                      className={`w-full flex items-center gap-3 px-4 pl-8 py-2 text-sm transition-colors ${
                                        theme === opt.mode
                                          ? "text-primary bg-primary/5"
                                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                      }`}>
                                      <opt.icon className="h-3.5 w-3.5" />
                                      {opt.label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="h-px bg-border" />
                          <Link
                            to="/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            Settings
                          </Link>
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setLogoutConfirm(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                            <LogOut className="h-4 w-4" />
                            Logout
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search dropdown */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              ref={mobileSearchRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden border-t border-border overflow-hidden">
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search discussions, topics, users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                    className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
                  />
                </div>
                {(suggestions.length > 0 || loadingSuggestions) && (
                  <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
                    <SuggestionsList />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-4 sm:px-6"
            onClick={() => setLogoutConfirm(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                Sign out?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to log out of Academiq?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLogoutConfirm(false)}
                  className="flex-1 cursor-pointer rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 cursor-pointer rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
