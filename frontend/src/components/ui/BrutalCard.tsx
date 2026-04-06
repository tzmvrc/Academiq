import * as React from "react";
import { Card, type CardProps } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "violet" | "pink" | "yellow" | "teal" | "mint" | "default";
}

const BrutalCard = React.forwardRef<HTMLDivElement, BrutalCardProps>(
  ({ className, color = "default", ...props }, ref) => {
    const colorClasses = {
      violet: "border-violet-500",
      pink: "border-pink-500",
      yellow: "border-yellow-500",
      teal: "border-teal-500",
      mint: "border-green-500",
      default: "border-foreground",
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "border-2 border-foreground shadow-brutal",
          colorClasses[color],
          className,
        )}
        {...props}
      />
    );
  },
);
BrutalCard.displayName = "BrutalCard";

export { BrutalCard };
