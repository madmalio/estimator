import React, { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { cn } from '../../lib/utils';

interface StatusBadgeMenuProps {
  status: string | undefined;
  kind: 'proposal' | 'estimate';
  statuses: readonly string[];
  onChange: (status: string) => void;
  disabled?: boolean;
}

export function StatusBadgeMenu({
  status,
  kind,
  statuses,
  onChange,
  disabled,
}: StatusBadgeMenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const current = (status || 'draft').toLowerCase();

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition((prev) =>
      prev ? null : { top: rect.bottom + 4, left: rect.left },
    );
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        className={cn(
          'rounded-md transition-opacity focus:outline-none focus:ring-2 focus:ring-zinc-500',
          !disabled && 'hover:opacity-80',
        )}
        title="Change status"
      >
        <StatusBadge status={status} kind={kind} />
      </button>

      {position && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={(event) => {
              event.stopPropagation();
              setPosition(null);
            }}
            aria-label="Close status menu"
          />
          <div
            className="fixed z-40 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden"
            style={{ top: position.top, left: position.left }}
          >
            {statuses.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800',
                  option === current ? 'bg-zinc-800/60' : 'text-zinc-200',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  setPosition(null);
                  if (option !== current) {
                    onChange(option);
                  }
                }}
              >
                <StatusBadge status={option} kind={kind} />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}