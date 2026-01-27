import type { ButtonHTMLAttributes } from "react";
import { Button } from "../ui/button";

interface GoogleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function GoogleButton({ className = "", ...rest }: GoogleButtonProps) {
  return (
    <Button
      className={`flex items-center gap-2 px-4 py-2 border-3 shadow-brutal font-semibold ${className}`}
      {...rest}
    >
      <img src="/icons/google.svg" alt="Google logo" className="w-5 h-5" />
      <span>Continue with Google</span>
    </Button>
  );
}
