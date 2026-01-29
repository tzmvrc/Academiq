import React from 'react';
import { cn } from '@/lib/utils';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  color?: 'default' | 'yellow' | 'teal' | 'pink' | 'coral' | 'violet' | 'mint';
}

const colorStyles = {
  default: 'bg-card',
  yellow: 'bg-yellow',
  teal: 'bg-teal',
  pink: 'bg-pink',
  coral: 'bg-coral',
  violet: 'bg-violet text-primary-foreground',
  mint: 'bg-mint',
};

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  className,
  hoverEffect = true,
  color = 'default',
}) => {
  return (
    <div
      className={cn(
        'border-[3px] border-foreground rounded-lg shadow-brutal',
        colorStyles[color],
        hoverEffect && 'transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg',
        className
      )}
    >
      {children}
    </div>
  );
};
