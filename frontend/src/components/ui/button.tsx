// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => {
  const base = 'px-6 py-3 text-sm tracking-wide border transition';
  const styles =
    variant === 'primary'
      ? 'border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900'
      : 'border-gray-300 text-gray-700 hover:border-gray-900';
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
};

export default Button;