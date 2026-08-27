import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface EditableNumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  precision?: number;
  round?: boolean;
}

export function EditableNumberInput({
  label,
  value,
  onChange,
  precision = 2,
  round = false,
  className,
  onKeyDown,
  id,
  ...props
}: EditableNumberInputProps) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const handleFocus = () => {
    setIsFocused(true);
    setDraft(value === 0 ? '' : value.toFixed(precision));
  };

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      onChange(0);
      return;
    }
    onChange(round ? Math.round(parsed) : parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    commit(draft);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        value={isFocused ? draft : value === 0 ? '' : value.toFixed(precision)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        className={cn(
          'w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100',
          'focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500',
          className
        )}
        {...props}
      />
    </div>
  );
}