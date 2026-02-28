import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100">
      {children}
    </div>
  );
}
