import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  const hoverStyles = hover
    ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-card-bg border border-border rounded-xl p-6 shadow-sm ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
}
