import React from 'react';
import { cn } from '@/lib/utils';

interface BrutalTagProps {
  children: React.ReactNode;
  color?: 'yellow' | 'teal' | 'pink' | 'coral' | 'violet' | 'mint' | 'default';
  className?: string;
  onClick?: () => void;
}

const colorStyles = {
  default: 'bg-muted text-foreground',
  yellow: 'bg-yellow text-foreground',
  teal: 'bg-teal text-foreground',
  pink: 'bg-pink text-foreground',
  coral: 'bg-coral text-foreground',
  violet: 'bg-violet text-primary-foreground',
  mint: 'bg-mint text-foreground',
};

export const BrutalTag: React.FC<BrutalTagProps> = ({
  children,
  color = 'default',
  className,
  onClick,
}) => {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1 text-sm font-bold border-[2px] border-foreground rounded-full shadow-brutal-sm',
        colorStyles[color],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
    >
      {children}
    </span>
  );
};
