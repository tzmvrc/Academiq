import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance, { clearAuth } from "@/integration/axiosInstance";
import {
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import Icon from "@/components/ui/Icon.png";

const navTabs = [
  { label: "Feed", path: "/feed" },
  { label: "Peers", path: "/peers" },
  { label: "Leaderboards", path: "/leaderboards" },
  { label: "Interests", path: "/interests" },
];

const searchSuggestions = [
  { type: "topic", text: "Computer Science" },
  { type: "topic", text: "Artificial Intelligence" },
  { type: "topic", text: "Machine Learning" },
  { type: "topic", text: "Engineering" },
  { type: "topic", text: "Mathematics" },
  { type: "post", text: "Attention Is All You Need — Revisited" },
  { type: "post", text: "Bayesian Methods for Clinical Trials" },
  { type: "post", text: "Formal Verification of Smart Contracts" },
  { type: "user", text: "Dr. Emily Zhang" },
  { type: "user", text: "Prof. Michael Torres" },
  { type: "user", text: "Lina Kovacs" },
  { type: "post", text: "Quantum Error Correction" },
  { type: "topic", text: "Economics" },
  { type: "topic", text: "Medicine" },
  { type: "topic", text: "Business" },
];

type ThemeMode = "light" | "dark" | "system";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("academiq-theme") as ThemeMode) || "light";
  });
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions =
    searchQuery.length > 0
      ? searchSuggestions
          .filter((s) =>
            s.text.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 6)
      : [];

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setLogoutConfirm(false);
    setProfileOpen(false);
    toast({
      title: "Logged out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setThemeOpen(false);
    toast({
      title: `Theme: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      description: `Switched to ${mode} mode.`,
    });
  };

  const handleSearchSelect = (s: { type: string; text: string }) => {
    setSearchQuery(s.text);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    if (s.type === "topic") {
      navigate(`/feed?topic=${encodeURIComponent(s.text)}`);
    }
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  const SuggestionsList = () => (
    <>
      {filteredSuggestions.map((s, i) => (
        <button
          key={i}
          onMouseDown={(e) => {
            e.preventDefault();
            handleSearchSelect(s);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors"
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-10 shrink-0">
            {s.type}
          </span>
          <span className="text-sm text-foreground truncate">{s.text}</span>
        </button>
      ))}
    </>
  );

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center px-4 sm:px-6 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img src={Icon} alt="Academiq Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="text-lg sm:text-xl font-heading font-bold text-foreground tracking-tight">
              Academiq
            </span>
          </Link>

          {/* Center Tabs - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
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
                  }`}
                >
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
              className={`relative hidden sm:block transition-all duration-300 ${searchFocused ? "w-64 lg:w-72" : "w-40 lg:w-48"}`}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-body"
                onFocus={() => setSearchFocused(true)}
              />
              <AnimatePresence>
                {searchFocused && filteredSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50"
                  >
                    <SuggestionsList />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile search toggle */}
            <button
              className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to="/notifications"
              className="relative p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 h-2 w-2 rounded-full bg-accent" />
            </Link>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg p-1 sm:p-1.5 hover:bg-secondary transition-colors"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs font-semibold text-primary">
                    AK
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground hidden sm:block transition-transform ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50"
                  >
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-primary">
                          AK
                        </span>
                      </div>
                      Profile
                    </Link>
                    <div className="h-px bg-border" />

                    {/* Theme Mode */}
                    <div className="relative">
                      <button
                        onClick={() => setThemeOpen(!themeOpen)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                          Theme
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${themeOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence>
                        {themeOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
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
                                onClick={() => handleThemeChange(opt.mode)}
                                className={`w-full flex items-center gap-3 px-4 pl-8 py-2 text-sm transition-colors ${
                                  theme === opt.mode
                                    ? "text-primary bg-primary/5"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                }`}
                              >
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
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setLogoutConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
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
              className="sm:hidden border-t border-border overflow-hidden"
            >
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search discussions, topics, users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
                  />
                </div>
                {filteredSuggestions.length > 0 && (
                  <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
                    <SuggestionsList />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {navTabs.map((tab) => {
                  const isActive = location.pathname === tab.path;
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
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
            onClick={() => setLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
            >
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                Sign out?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to log out of Academiq?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLogoutConfirm(false)}
                  className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
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
