import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white border-ink",
  secondary: "bg-white text-ink border-ink",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        px-4 py-2
        border-3
        shadow-brutal
        font-semibold
        transition
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        ${variants[variant]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
