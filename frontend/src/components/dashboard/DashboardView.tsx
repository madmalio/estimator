import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { EstimateJob, ManualQuote } from '../../types';
import {
  GetAllEstimates,
  GetAllManualQuotes,
  GetCustomersPage,
} from '../../../wailsjs/go/main/App';

interface DashboardViewProps {
  onOpenProposals: () => void;
  onOpenEstimates: () => void;
  onOpenProposal: (id: number) => void;
  onOpenEstimate: (id: number) => void;
  onOpenProposalStatus: (status: string) => void;
  onOpenEstimateStatus: (status: string) => void;
}

const proposalStatuses = ['draft', 'sent', 'approved', 'declined', 'closed'] as const;
const estimateStatuses = ['draft', 'quoted', 'approved', 'in-progress', 'installed', 'closed'] as const;

function normalizeStatus(status: string | undefined) {
  return (status || 'draft').toLowerCase();
}

export function DashboardView({
  onOpenProposals,
  onOpenEstimates,
  onOpenProposal,
  onOpenEstimate,
  onOpenProposalStatus,
  onOpenEstimateStatus,
}: DashboardViewProps) {
  const [activeCustomerTotal, setActiveCustomerTotal] = useState(0);
  const [archivedCustomerTotal, setArchivedCustomerTotal] = useState(0);
  const [proposals, setProposals] = useState<ManualQuote[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [activeCustomersPage, archivedCustomersPage, proposalData, estimateData] = await Promise.all([
          GetCustomersPage({ page: 1, pageSize: 1, search: '', showArchived: false }),
          GetCustomersPage({ page: 1, pageSize: 1, search: '', showArchived: true }),
          GetAllManualQuotes(),
          GetAllEstimates(),
        ]);

        if (cancelled) {
          return;
        }

        setActiveCustomerTotal(activeCustomersPage?.total || 0);
        setArchivedCustomerTotal(archivedCustomersPage?.total || 0);
        setProposals((proposalData || []) as ManualQuote[]);
        setEstimates((estimateData || []) as EstimateJob[]);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load dashboard data:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const proposalStatusCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(proposalStatuses.map((status) => [status, 0]));
    proposals.forEach((quote) => {
      const status = normalizeStatus(quote.status);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [proposals]);

  const estimateStatusCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(estimateStatuses.map((status) => [status, 0]));
    estimates.forEach((estimate) => {
      const status = normalizeStatus(estimate.status);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [estimates]);

  const recentProposals = useMemo(() => {
    return [...proposals]
      .sort((a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime())
      .slice(0, 5);
  }, [proposals]);

  const recentEstimates = useMemo(() => {
    return [...estimates]
      .sort((a, b) => new Date(b.estimateDate).getTime() - new Date(a.estimateDate).getTime())
      .slice(0, 5);
  }, [estimates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Dashboard</h2>
          <p className="text-sm text-zinc-400">Quick snapshot of your active cabinet workflow.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Active Customers</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{activeCustomerTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Archived Customers</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{archivedCustomerTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Open Proposals</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{proposals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Open Custom Cabinets</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{estimates.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-100">Proposal Pipeline</h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {proposalStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onOpenProposalStatus(status)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-left hover:bg-zinc-800"
              >
                <StatusBadge status={status} kind="proposal" />
                <p className="mt-1 text-xl font-semibold text-zinc-100">{proposalStatusCounts[status] || 0}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-100">Custom Cabinet Pipeline</h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {estimateStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onOpenEstimateStatus(status)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-left hover:bg-zinc-800"
              >
                <StatusBadge status={status} kind="estimate" />
                <p className="mt-1 text-xl font-semibold text-zinc-100">{estimateStatusCounts[status] || 0}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">Recent Proposals</h3>
              <Button variant="ghost" size="sm" onClick={onOpenProposals}>
                View all
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentProposals.length === 0 && <p className="text-sm text-zinc-400">No proposals yet.</p>}
            {recentProposals.map((quote) => (
              <div
                key={quote.id}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 hover:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onOpenProposal(quote.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-zinc-100">{quote.jobName || 'Untitled Proposal'}</p>
                    <p className="truncate text-xs text-zinc-400">{quote.customer?.name || 'No customer'} - {formatDate(quote.quoteDate)}</p>
                  </button>
                  <StatusBadge status={quote.status} kind="proposal" />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{formatCurrency(quote.total || 0)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">Recent Custom Cabinets</h3>
              <Button variant="ghost" size="sm" onClick={onOpenEstimates}>
                View all
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEstimates.length === 0 && <p className="text-sm text-zinc-400">No custom cabinets yet.</p>}
            {recentEstimates.map((estimate) => (
              <div
                key={estimate.jobId}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 hover:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onOpenEstimate(estimate.jobId)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-zinc-100">{estimate.jobName || 'Untitled Job'}</p>
                    <p className="truncate text-xs text-zinc-400">{estimate.customer?.name || 'No customer'} - {formatDate(estimate.estimateDate)}</p>
                  </button>
                  <StatusBadge status={estimate.status} kind="estimate" />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{formatCurrency(estimate.totalAmount || 0)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
