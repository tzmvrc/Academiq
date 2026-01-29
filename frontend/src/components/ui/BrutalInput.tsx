import React from 'react';
import { cn } from '@/lib/utils';

interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const BrutalInput: React.FC<BrutalInputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-foreground">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'placeholder:text-muted-foreground',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
};
