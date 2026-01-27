import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Feed" },
  { to: "/dashboard/profile", label: "Profile" },
  { to: "/dashboard/peers", label: "Peers" },
  { to: "/dashboard/leaderboard", label: "Leaderboard" },
  { to: "/dashboard/interests", label: "Interests" },
];

export function SideNav() {
  const { pathname } = useLocation();

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <nav className="flex lg:flex-col gap-3">
        {links.map((link) => {
          const active = pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                px-4 py-2
                border-3
                font-bold
                transition
                ${
                  active
                    ? "bg-accent text-white border-ink shadow-brutal"
                    : "bg-white text-ink border-ink shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                }
              `}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
