import * as React from "react";
import { Input } from "@/components/ui/input";

export type BrutalInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const BrutalInput = React.forwardRef<HTMLInputElement, BrutalInputProps>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={className} {...props} />
  ),
);
BrutalInput.displayName = "BrutalInput";

export { BrutalInput };
