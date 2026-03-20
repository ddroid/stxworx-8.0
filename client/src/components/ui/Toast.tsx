import React from 'react';

type ToastProps = {
  message: string;
};

export const Toast = ({ message }: ToastProps) => {
  return <div className="rounded-[15px] border border-border bg-surface px-4 py-3 text-sm shadow-lg">{message}</div>;
};
