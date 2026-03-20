import React from 'react';

type BadgeProps = {
  className?: string;
  children?: React.ReactNode;
};

export const Badge = ({ className = '', children }: BadgeProps) => {
  return <span className={`rounded-full bg-accent-orange/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-orange ${className}`.trim()}>{children}</span>;
};
