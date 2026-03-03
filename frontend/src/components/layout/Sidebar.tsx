import React, { useState } from 'react';
import { FileText, Users, List, Settings, Clipboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ViewType = 'estimates' | 'manualquotes' | 'customers' | 'pricelist' | 'settings';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { id: 'customers', label: 'Customers', icon: <Users size={20} /> },
  { id: 'manualquotes', label: 'Proposals', icon: <Clipboard size={20} /> },
  { id: 'estimates', label: 'Custom Cabinets', icon: <FileText size={20} /> },
  { id: 'pricelist', label: 'Price Lists', icon: <List size={20} /> },
];

const settingsNavItem: NavItem = { id: 'settings', label: 'Settings', icon: <Settings size={20} /> };

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-zinc-900 border-r border-zinc-800 flex flex-col no-print transition-all duration-200',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="px-3 py-4 border-b border-zinc-800">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
          {!isCollapsed && (
            <h1 className="text-zinc-100 font-bold whitespace-nowrap text-xl">CabCon</h1>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              'w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isCollapsed ? 'justify-center' : 'gap-3',
              activeView === item.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            {item.icon}
            {!isCollapsed && item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button
          onClick={() => onViewChange(settingsNavItem.id)}
          title={isCollapsed ? settingsNavItem.label : undefined}
          className={cn(
            'w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isCollapsed ? 'justify-center' : 'gap-3',
            activeView === settingsNavItem.id
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          )}
        >
          {settingsNavItem.icon}
          {!isCollapsed && settingsNavItem.label}
        </button>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800">
        <p className={cn('text-zinc-500', isCollapsed ? 'text-[10px] text-center' : 'text-xs')}>v1.0.0</p>
      </div>
    </aside>
  );
}
