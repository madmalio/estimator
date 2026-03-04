import { CheckCircle2, CircleDashed, CircleX, Hammer, Send, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

type StatusKind = 'proposal' | 'estimate';

interface StatusBadgeProps {
  status: string | undefined;
  kind: StatusKind;
  className?: string;
}

function normalize(status: string | undefined) {
  return (status || 'draft').toLowerCase();
}

function toLabel(status: string) {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function styleFor(status: string, kind: StatusKind) {
  const value = normalize(status);

  if (value === 'approved') {
    return {
      className: 'status-badge--approved',
      icon: <ShieldCheck size={12} />,
    };
  }

  if (value === 'closed' || value === 'installed') {
    return {
      className: 'status-badge--closed',
      icon: <CheckCircle2 size={12} />,
    };
  }

  if (value === 'declined') {
    return {
      className: 'status-badge--declined',
      icon: <CircleX size={12} />,
    };
  }

  if (value === 'in-progress') {
    return {
      className: 'status-badge--in-progress',
      icon: <Hammer size={12} />,
    };
  }

  if (value === 'sent' || value === 'quoted') {
    return {
      className: 'status-badge--active',
      icon: <Send size={12} />,
    };
  }

  if (value === 'draft') {
    return {
      className: 'status-badge--draft',
      icon: <CircleDashed size={12} />,
    };
  }

  return {
    className: kind === 'proposal'
      ? 'status-badge--active'
      : 'status-badge--in-progress',
    icon: kind === 'proposal' ? <Send size={12} /> : <Hammer size={12} />,
  };
}

export function StatusBadge({ status, kind, className }: StatusBadgeProps) {
  const value = normalize(status);
  const style = styleFor(value, kind);

  return (
    <span
      className={cn(
        'status-badge inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        style.className,
        className
      )}
    >
      {style.icon}
      {toLabel(value)}
    </span>
  );
}
