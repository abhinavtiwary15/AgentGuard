import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  let baseClass = 'inline-flex items-center justify-center rounded-sm transition-colors btn-text focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1';
  
  if (variant === 'primary') baseClass += ' bg-brand text-white hover:bg-brand-hover shadow-sm';
  if (variant === 'secondary') baseClass += ' bg-bg-raised text-text-primary hover:bg-border-medium border border-border-subtle';
  if (variant === 'ghost') baseClass += ' bg-transparent text-text-secondary hover:text-brand hover:bg-brand-light';

  let sizeClass = 'px-4 py-2';
  if (size === 'sm') sizeClass = 'px-3 py-1.5 text-[11px]';
  if (size === 'lg') sizeClass = 'px-6 py-3 text-[14px]';

  return (
    <button className={`${baseClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
