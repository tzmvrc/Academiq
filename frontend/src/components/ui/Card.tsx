import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({
  children,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-white border-3 border-ink shadow-brutal p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
