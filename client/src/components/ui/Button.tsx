import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ className = '', type = 'button', ...props }: ButtonProps) => {
  return <button type={type} className={`btn-primary ${className}`.trim()} {...props} />;
};
