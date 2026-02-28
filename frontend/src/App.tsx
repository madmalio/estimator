import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { EstimateGenerator } from './components/estimates/EstimateGenerator';
import { CustomerList } from './components/customers/CustomerList';
import { PriceListView } from './components/pricelist/PriceListView';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('estimates');

  return (
    <Layout>
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        {activeView === 'estimates' && <EstimateGenerator />}
        {activeView === 'customers' && <CustomerList />}
        {activeView === 'pricelist' && <PriceListView />}
      </main>
    </Layout>
  );
}

export default App;
