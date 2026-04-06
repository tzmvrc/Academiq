import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BrutalTagProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "violet" | "pink" | "yellow" | "teal" | "mint" | "default";
}

const BrutalTag: React.FC<BrutalTagProps> = ({
  className,
  color = "default",
  ...props
}) => {
  const bgClasses = {
    violet: "bg-violet-100 text-violet-700 border-violet-500",
    pink: "bg-pink-100 text-pink-700 border-pink-500",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-500",
    teal: "bg-teal-100 text-teal-700 border-teal-500",
    mint: "bg-green-100 text-green-700 border-green-500",
    default: "bg-gray-100 text-gray-700 border-gray-500",
  };

  return (
    <Badge
      className={cn(
        "border border-2 border-foreground",
        bgClasses[color],
        className,
      )}
      {...props}
    />
  );
};
BrutalTag.displayName = "BrutalTag";

export { BrutalTag };
