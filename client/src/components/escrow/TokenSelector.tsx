import React from 'react';

type TokenSelectorProps = {
  value?: string;
  onChange?: (value: string) => void;
  options?: string[];
};

export const TokenSelector = ({ value = 'STX', onChange, options = ['STX', 'sBTC', 'USDCx'] }: TokenSelectorProps) => {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="w-full rounded-[15px] border border-border bg-ink/5 px-4 py-3 text-sm outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
