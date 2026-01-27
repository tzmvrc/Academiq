import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { Logo } from "../branding/Logo";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Logo />
        <h2 className="font-black text-2xl">{title}</h2>
      </div>
      <div>{children}</div>
    </Card>
  );
}
