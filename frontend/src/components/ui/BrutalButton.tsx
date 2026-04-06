import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type BrutalButtonProps = ButtonProps;

const BrutalButton = React.forwardRef<HTMLButtonElement, BrutalButtonProps>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} className={className} {...props} />
  ),
);
BrutalButton.displayName = "BrutalButton";

export { BrutalButton };
