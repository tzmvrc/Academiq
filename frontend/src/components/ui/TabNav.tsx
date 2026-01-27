import type { FC } from "react";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export const TabNav: FC<Props> = ({ tabs, active, onChange }) => {
  return (
    <nav className="flex gap-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 border-3 font-bold transition ${
            active === t.id
              ? "bg-accent text-white border-ink shadow-brutal"
              : "bg-white text-ink border-ink shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
};
