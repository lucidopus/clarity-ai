import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-card-bg border border-accent/50 rounded-xl p-6 shadow-lg shadow-black/10 dark:shadow-black/40 cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}
