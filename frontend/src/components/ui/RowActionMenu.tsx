import React from 'react';

export interface RowActionMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface RowActionMenuProps {
  top: number;
  left: number;
  onClose: () => void;
  items: RowActionMenuItem[];
}

export function RowActionMenu({ top, left, onClose, items }: RowActionMenuProps) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 cursor-default"
        onClick={onClose}
        aria-label="Close actions menu"
      />
      <div
        className="fixed z-40 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden"
        style={{ top, left }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
              item.danger ? 'text-red-300' : 'text-zinc-200'
            }`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <span className="inline-flex items-center gap-2">{item.icon}{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}