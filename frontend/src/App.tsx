import { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { EstimateGenerator } from './components/estimates/EstimateGenerator';
import { ProposalsView } from './components/proposals/ProposalsView';
import { CustomerList } from './components/customers/CustomerList';
import { PriceListView } from './components/pricelist/PriceListView';
import { SettingsView } from './components/settings/SettingsView';
import { GetCompanySettings } from '../wailsjs/go/main/App';
import type { Customer, GlobalSearchResult } from './types';
import doorIcon from './assets/door_icon_v3.png';

interface CustomerQuickCreateState {
  customerId: number;
  customerName: string;
  token: number;
}

interface OpenRecordState {
  id: number;
  token: number;
}

interface CustomerSearchState {
  query: string;
  token: number;
}

interface StatusFilterRequestState {
  status: string;
  token: number;
}

function AppLoadingScreen() {
  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl border border-zinc-700/80 bg-zinc-900/70 p-1.5 shadow-lg shadow-blue-900/30">
          <img src={doorIcon} alt="CabCon icon" className="h-full w-full rounded-xl object-cover" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">CabCon</h1>
        <p className="mt-1 text-sm text-zinc-400">Loading workspace...</p>
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [quickCreateProposal, setQuickCreateProposal] = useState<CustomerQuickCreateState | null>(null);
  const [quickCreateEstimate, setQuickCreateEstimate] = useState<CustomerQuickCreateState | null>(null);
  const [openProposalRecord, setOpenProposalRecord] = useState<OpenRecordState | null>(null);
  const [openEstimateRecord, setOpenEstimateRecord] = useState<OpenRecordState | null>(null);
  const [customerSearchRequest, setCustomerSearchRequest] = useState<CustomerSearchState | null>(null);
  const [proposalStatusRequest, setProposalStatusRequest] = useState<StatusFilterRequestState | null>(null);
  const [estimateStatusRequest, setEstimateStatusRequest] = useState<StatusFilterRequestState | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const initializeApp = async () => {
      await Promise.allSettled([
        GetCompanySettings(),
        new Promise((resolve) => setTimeout(resolve, 550)),
      ]);

      if (!isCancelled) {
        setIsAppLoading(false);
      }
    };

    void initializeApp();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCreateProposalForCustomer = (customer: Customer) => {
    setQuickCreateProposal({
      customerId: customer.id,
      customerName: customer.name,
      token: Date.now(),
    });
    setActiveView('manualquotes');
  };

  const handleCreateEstimateForCustomer = (customer: Customer) => {
    setQuickCreateEstimate({
      customerId: customer.id,
      customerName: customer.name,
      token: Date.now(),
    });
    setActiveView('estimates');
  };

  const handleOpenSearchResult = (result: GlobalSearchResult) => {
    const token = Date.now();

    if (result.type === 'customer') {
      setCustomerSearchRequest({ query: result.title, token });
      setActiveView('customers');
      return;
    }

    if (result.type === 'proposal') {
      setOpenProposalRecord({ id: result.id, token });
      setActiveView('manualquotes');
      return;
    }

    if (result.type === 'estimate') {
      setOpenEstimateRecord({ id: result.id, token });
      setActiveView('estimates');
    }
  };

  const openProposalRecordById = (id: number) => {
    const token = Date.now();
    setOpenProposalRecord({ id, token });
    setActiveView('manualquotes');
  };

  const openEstimateRecordById = (id: number) => {
    const token = Date.now();
    setOpenEstimateRecord({ id, token });
    setActiveView('estimates');
  };

  const openProposalStatus = (status: string) => {
    const token = Date.now();
    setProposalStatusRequest({ status, token });
    setActiveView('manualquotes');
  };

  const openEstimateStatus = (status: string) => {
    const token = Date.now();
    setEstimateStatusRequest({ status, token });
    setActiveView('estimates');
  };

  if (isAppLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <Layout>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSearch={() => setIsCommandBarOpen(true)}
      />
      <GlobalCommandBar
        isOpen={isCommandBarOpen}
        onOpenChange={setIsCommandBarOpen}
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenResult={handleOpenSearchResult}
      />
      <main className="flex-1 p-6 overflow-auto">
        {activeView === 'dashboard' && (
          <DashboardView
            onOpenProposals={() => setActiveView('manualquotes')}
            onOpenEstimates={() => setActiveView('estimates')}
            onOpenProposal={openProposalRecordById}
            onOpenEstimate={openEstimateRecordById}
            onOpenProposalStatus={openProposalStatus}
            onOpenEstimateStatus={openEstimateStatus}
          />
        )}
        {activeView === 'estimates' && (
          <EstimateGenerator
            quickCreateForCustomer={quickCreateEstimate}
            onQuickCreateHandled={() => setQuickCreateEstimate(null)}
            openEstimateRecord={openEstimateRecord}
            onOpenEstimateHandled={() => setOpenEstimateRecord(null)}
            statusRequest={estimateStatusRequest}
            onStatusRequestHandled={() => setEstimateStatusRequest(null)}
          />
        )}
        {activeView === 'manualquotes' && (
          <ProposalsView
            quickCreateForCustomer={quickCreateProposal}
            onQuickCreateHandled={() => setQuickCreateProposal(null)}
            openProposalRecord={openProposalRecord}
            onOpenProposalHandled={() => setOpenProposalRecord(null)}
            statusRequest={proposalStatusRequest}
            onStatusRequestHandled={() => setProposalStatusRequest(null)}
          />
        )}
        {activeView === 'customers' && (
          <CustomerList
            onCreateProposalForCustomer={handleCreateProposalForCustomer}
            onCreateEstimateForCustomer={handleCreateEstimateForCustomer}
            searchRequest={customerSearchRequest}
            onSearchRequestHandled={() => setCustomerSearchRequest(null)}
          />
        )}
        {activeView === 'pricelist' && <PriceListView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </Layout>
  );
}

export default App;
