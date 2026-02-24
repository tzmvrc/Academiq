import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search discussions...",
  className,
}) => {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="w-5 h-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
      />
    </div>
  );
};
