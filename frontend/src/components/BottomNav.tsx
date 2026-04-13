import { Link, useLocation } from "react-router-dom";
import { Home, Users, Trophy, Bookmark } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Feed", path: "/feed", icon: Home },
  { label: "Peers", path: "/peers", icon: Users },
  { label: "Leaderboards", path: "/leaderboards", icon: Trophy },
  { label: "Interests", path: "/interests", icon: Bookmark },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <>
      {/* Bottom navigation - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center w-full h-full gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Icon className={`h-6 w-6 ${isActive ? "text-primary" : ""}`} />
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Spacer for mobile to avoid content overlap */}
      <div className="md:hidden h-16" />
    </>
  );
};

export default BottomNav;
