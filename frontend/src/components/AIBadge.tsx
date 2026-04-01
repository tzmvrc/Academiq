import { Sparkles, ShieldCheck } from "lucide-react";

interface AIBadgeProps {
  variant?: "verified" | "summary" | "comment";
  size?: "sm" | "md";
}

const AIBadge = ({ variant = "verified", size = "sm" }: AIBadgeProps) => {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-2.5 py-1 gap-1.5";

  if (variant === "verified") {
    return (
      <span className={`inline-flex items-center rounded-full bg-ai-subtle text-ai font-medium ${sizeClasses}`}>
        <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        AI Verified
      </span>
    );
  }

  if (variant === "summary") {
    return (
      <span className={`inline-flex items-center rounded-full bg-ai-subtle text-ai font-medium ${sizeClasses}`}>
        <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        AI Summary
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-success/10 text-success font-medium ${sizeClasses}`}>
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Verified
    </span>
  );
};

export default AIBadge;
