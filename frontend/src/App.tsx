import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { EstimateGenerator } from './components/estimates/EstimateGenerator';
import { ManualQuotesView } from './components/manualquotes/ManualQuotesView';
import { CustomerList } from './components/customers/CustomerList';
import { PriceListView } from './components/pricelist/PriceListView';
import { SettingsView } from './components/settings/SettingsView';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('estimates');

  return (
    <Layout>
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        {activeView === 'estimates' && <EstimateGenerator />}
        {activeView === 'manualquotes' && <ManualQuotesView />}
        {activeView === 'customers' && <CustomerList />}
        {activeView === 'pricelist' && <PriceListView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </Layout>
  );
}

export default App;
