import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({
  className = "",
  ...rest
}: InputProps) {
  return (
    <input
      className={`
        w-full
        px-4 py-2
        border-3 border-ink
        shadow-brutal
        bg-white text-ink
        outline-none
        focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none
        ${className}
      `}
      {...rest}
    />
  );
}
