import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = '', ...props }: InputProps) => {
  return <input className={`w-full rounded-[15px] border border-border bg-ink/5 px-4 py-3 text-sm outline-none ${className}`.trim()} {...props} />;
};
