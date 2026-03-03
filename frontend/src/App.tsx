import { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { EstimateGenerator } from './components/estimates/EstimateGenerator';
import { ProposalsView } from './components/proposals/ProposalsView';
import { CustomerList } from './components/customers/CustomerList';
import { PriceListView } from './components/pricelist/PriceListView';
import { SettingsView } from './components/settings/SettingsView';
import { GetCompanySettings } from '../wailsjs/go/main/App';
import type { Customer } from './types';

interface CustomerQuickCreateState {
  customerId: number;
  customerName: string;
  token: number;
}

function AppLoadingScreen() {
  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">CabCon</h1>
        <p className="mt-1 text-sm text-zinc-400">Loading workspace...</p>
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ViewType>('customers');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [quickCreateProposal, setQuickCreateProposal] = useState<CustomerQuickCreateState | null>(null);
  const [quickCreateEstimate, setQuickCreateEstimate] = useState<CustomerQuickCreateState | null>(null);

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

  if (isAppLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <Layout>
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        {activeView === 'estimates' && (
          <EstimateGenerator
            quickCreateForCustomer={quickCreateEstimate}
            onQuickCreateHandled={() => setQuickCreateEstimate(null)}
          />
        )}
        {activeView === 'manualquotes' && (
          <ProposalsView
            quickCreateForCustomer={quickCreateProposal}
            onQuickCreateHandled={() => setQuickCreateProposal(null)}
          />
        )}
        {activeView === 'customers' && (
          <CustomerList
            onCreateProposalForCustomer={handleCreateProposalForCustomer}
            onCreateEstimateForCustomer={handleCreateEstimateForCustomer}
          />
        )}
        {activeView === 'pricelist' && <PriceListView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </Layout>
  );
}

export default App;
