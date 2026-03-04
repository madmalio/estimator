import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FileText, Clipboard, Search, Settings, Users, List, LayoutDashboard } from 'lucide-react';
import { SearchGlobal } from '../../../wailsjs/go/main/App';
import type { GlobalSearchResult } from '../../types';
import type { ViewType } from './Sidebar';

interface GlobalCommandBarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenResult: (result: GlobalSearchResult) => void;
}

interface NavCommand {
  key: string;
  label: string;
  subtitle: string;
  view: ViewType;
}

type CommandItem =
  | { kind: 'nav'; key: string; label: string; subtitle: string; icon: JSX.Element; view: ViewType }
  | { kind: 'result'; key: string; result: GlobalSearchResult; icon: JSX.Element };

const navCommands: NavCommand[] = [
  { key: 'dashboard', label: 'Go to Dashboard', subtitle: 'View pipeline and recent records', view: 'dashboard' },
  { key: 'customers', label: 'Go to Customers', subtitle: 'View customer list', view: 'customers' },
  { key: 'manualquotes', label: 'Go to Proposals', subtitle: 'View proposal list', view: 'manualquotes' },
  { key: 'estimates', label: 'Go to Custom Cabinets', subtitle: 'View custom cabinet list', view: 'estimates' },
  { key: 'pricelist', label: 'Go to Price Lists', subtitle: 'View price list categories', view: 'pricelist' },
  { key: 'settings', label: 'Go to Settings', subtitle: 'View app settings', view: 'settings' },
];

function normalizeResult(result: {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  meta: string;
}): GlobalSearchResult | null {
  if (result.type !== 'customer' && result.type !== 'proposal' && result.type !== 'estimate') {
    return null;
  }

  return {
    type: result.type,
    id: result.id,
    title: result.title,
    subtitle: result.subtitle,
    meta: result.meta,
  };
}

function iconForView(view: ViewType) {
  switch (view) {
    case 'dashboard':
      return <LayoutDashboard size={16} className="text-zinc-300" />;
    case 'customers':
      return <Users size={16} className="text-zinc-300" />;
    case 'manualquotes':
      return <Clipboard size={16} className="text-zinc-300" />;
    case 'estimates':
      return <FileText size={16} className="text-zinc-300" />;
    case 'pricelist':
      return <List size={16} className="text-zinc-300" />;
    case 'settings':
      return <Settings size={16} className="text-zinc-300" />;
    default:
      return <Search size={16} className="text-zinc-300" />;
  }
}

function iconForResult(type: GlobalSearchResult['type']) {
  switch (type) {
    case 'customer':
      return <Users size={16} className="text-zinc-300" />;
    case 'proposal':
      return <Clipboard size={16} className="text-zinc-300" />;
    case 'estimate':
      return <FileText size={16} className="text-zinc-300" />;
    default:
      return <Search size={16} className="text-zinc-300" />;
  }
}

export function GlobalCommandBar({ isOpen, onOpenChange, activeView, onNavigate, onOpenResult }: GlobalCommandBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return navCommands.map((item) => ({
        kind: 'nav',
        key: item.key,
        label: item.label,
        subtitle: item.subtitle,
        view: item.view,
        icon: iconForView(item.view),
      }));
    }

    return results.map((result) => ({
      kind: 'result',
      key: `${result.type}-${result.id}`,
      result,
      icon: iconForResult(result.type),
    }));
  }, [query, results]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!isOpen);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await SearchGlobal(trimmed);
        if (!cancelled) {
          const normalized = (found || []).map(normalizeResult).filter((item): item is GlobalSearchResult => item !== null);
          setResults(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Global search failed:', error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results, isOpen]);

  const close = () => {
    onOpenChange(false);
    setQuery('');
    setResults([]);
    setLoading(false);
    setSelectedIndex(0);
  };

  const runCommand = (item: CommandItem) => {
    if (item.kind === 'nav') {
      onNavigate(item.view);
      close();
      return;
    }

    onOpenResult(item.result);
    close();
  };

  const handleListKeydown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(commands.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = commands[selectedIndex];
      if (selected) {
        runCommand(selected);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 no-print">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="absolute left-1/2 top-[12%] w-full max-w-2xl -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
            <Search size={16} className="text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleListKeydown}
              placeholder="Search customers, proposals, and custom cabinets..."
              className="h-9 w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-500"
            />
            <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">Esc</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {!query.trim() && (
              <p className="px-2 py-1 text-xs text-zinc-500">Navigation</p>
            )}
            {query.trim().length > 0 && query.trim().length < 2 && (
              <p className="px-2 py-4 text-sm text-zinc-500">Type at least 2 characters to search records.</p>
            )}
            {loading && <p className="px-2 py-4 text-sm text-zinc-500">Searching...</p>}
            {!loading && query.trim().length >= 2 && commands.length === 0 && (
              <p className="px-2 py-4 text-sm text-zinc-500">No matches found.</p>
            )}

            {!loading && commands.map((item, index) => {
              const selected = index === selectedIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => runCommand(item)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${
                    selected ? 'bg-zinc-800' : 'hover:bg-zinc-800/80'
                  }`}
                >
                  <span className="mt-0.5">{item.icon}</span>
                  {item.kind === 'nav' ? (
                    <span>
                      <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                      <span className="block text-xs text-zinc-400">
                        {item.subtitle}
                        {item.view === activeView ? ' (current)' : ''}
                      </span>
                    </span>
                  ) : (
                    <span>
                      <span className="block text-sm font-medium text-zinc-100">{item.result.title}</span>
                      <span className="block text-xs text-zinc-400">
                        {item.result.subtitle}
                        {item.result.meta ? ` - ${item.result.meta}` : ''}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
