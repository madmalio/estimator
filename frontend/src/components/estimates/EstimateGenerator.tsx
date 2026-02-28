import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Save, ChevronLeft, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { LineItemTable } from './LineItemTable';
import { TotalsCard } from './TotalsCard';
import { formatCurrency, formatDate } from '../../lib/utils';
import type {
  Customer,
  Category,
  EstimateJob,
  EstimateLineItem,
  SortOrderUpdate,
  CreateLineItemRequest,
} from '../../types';
import {
  GetAllCustomers,
  GetAllCategoriesWithItems,
  GetAllEstimates,
  GetEstimate,
  CreateEstimate,
  UpdateEstimate,
  DeleteEstimate,
  AddLineItem,
  DeleteLineItem,
  UpdateLineItemSortOrder,
  GenerateEstimatePDF,
  OpenFileInDefaultApp,
} from '../../../wailsjs/go/main/App';

type ViewMode = 'list' | 'edit';

export function EstimateGenerator() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  const [currentEstimate, setCurrentEstimate] = useState<EstimateJob | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state for new estimate
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [jobName, setJobName] = useState('');

  // Item selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [itemQuantity, setItemQuantity] = useState('1');

  // Write-in item state
  const [writeInName, setWriteInName] = useState('');
  const [writeInQty, setWriteInQty] = useState('1');
  const [writeInPrice, setWriteInPrice] = useState('');

  // Totals state
  const [markupPercent, setMarkupPercent] = useState(0);
  const [installQty, setInstallQty] = useState(0);
  const [installRate, setInstallRate] = useState(0);
  const [miscCharge, setMiscCharge] = useState(0);

  const fetchData = async () => {
    try {
      const [customersData, categoriesData, estimatesData] = await Promise.all([
        GetAllCustomers(),
        GetAllCategoriesWithItems(),
        GetAllEstimates(),
      ]);
      setCustomers(customersData || []);
      setCategories(categoriesData || []);
      setEstimates(estimatesData || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryItems = selectedCategory?.items || [];

  const subtotal = useMemo(() => {
    return (currentEstimate?.lineItems || []).reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
  }, [currentEstimate?.lineItems]);

  const installTotal = installQty * installRate;
  const markupAmount = subtotal * (markupPercent / 100);
  const grandTotal = subtotal + markupAmount + installTotal + miscCharge;

  const loadEstimate = async (jobId: number) => {
    try {
      const estimate = await GetEstimate(jobId);
      if (estimate) {
        setCurrentEstimate(estimate);
        setSelectedCustomerId(estimate.customerId);
        setJobName(estimate.jobName);
        setMarkupPercent(estimate.markupPercent);
        setInstallQty(0);
        setInstallRate(0);
        if (estimate.installTotal > 0) {
          setInstallRate(estimate.installTotal);
          setInstallQty(1);
        }
        setMiscCharge(estimate.miscCharge);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('Failed to load estimate:', error);
    }
  };

  const handleCreateEstimate = async () => {
    if (!selectedCustomerId || !jobName.trim()) {
      alert('Please select a customer and enter a job name');
      return;
    }

    try {
      const estimate = await CreateEstimate({
        customerId: selectedCustomerId,
        jobName: jobName.trim(),
        markupPercent: 0,
        miscCharge: 0,
      });
      if (estimate) {
        setCurrentEstimate(estimate);
        setViewMode('edit');
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to create estimate:', error);
    }
  };

  const handleSaveEstimate = async () => {
    if (!currentEstimate) return;

    try {
      await UpdateEstimate({
        jobId: currentEstimate.jobId,
        customerId: selectedCustomerId,
        jobName: jobName.trim(),
        totalAmount: grandTotal,
        installTotal: installTotal,
        markupPercent,
        miscCharge,
      });
      await fetchData();
      alert('Estimate saved successfully');
    } catch (error) {
      console.error('Failed to save estimate:', error);
    }
  };

  const handleDeleteEstimate = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;

    try {
      await DeleteEstimate(jobId);
      if (currentEstimate?.jobId === jobId) {
        setCurrentEstimate(null);
        setViewMode('list');
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to delete estimate:', error);
    }
  };

  const handleAddPriceListItem = async () => {
    if (!currentEstimate || !selectedItemId) return;

    const item = categoryItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    const qty = parseFloat(itemQuantity) || 1;

    try {
      const req: CreateLineItemRequest = {
        jobId: currentEstimate.jobId,
        itemName: item.itemName,
        categoryName: selectedCategory?.name || '',
        quantity: qty,
        unitPrice: item.unitPrice,
      };
      await AddLineItem(req);

      // Reload the estimate to get updated line items
      const updated = await GetEstimate(currentEstimate.jobId);
      setCurrentEstimate(updated);

      // Reset selection
      setSelectedItemId(0);
      setItemQuantity('1');
    } catch (error) {
      console.error('Failed to add line item:', error);
    }
  };

  const handleAddWriteInItem = async () => {
    if (!currentEstimate || !writeInName.trim()) return;

    const qty = parseFloat(writeInQty) || 1;
    const price = parseFloat(writeInPrice) || 0;

    try {
      const req: CreateLineItemRequest = {
        jobId: currentEstimate.jobId,
        itemName: writeInName.trim(),
        categoryName: '',
        quantity: qty,
        unitPrice: price,
      };
      await AddLineItem(req);

      const updated = await GetEstimate(currentEstimate.jobId);
      setCurrentEstimate(updated);

      // Reset form
      setWriteInName('');
      setWriteInQty('1');
      setWriteInPrice('');
    } catch (error) {
      console.error('Failed to add write-in item:', error);
    }
  };

  const handleDeleteLineItem = async (id: number) => {
    if (!currentEstimate) return;

    try {
      await DeleteLineItem(id);
      const updated = await GetEstimate(currentEstimate.jobId);
      setCurrentEstimate(updated);
    } catch (error) {
      console.error('Failed to delete line item:', error);
    }
  };

  const handleReorderLineItems = async (updates: SortOrderUpdate[]) => {
    if (!currentEstimate) return;

    try {
      await UpdateLineItemSortOrder(updates);
      const updated = await GetEstimate(currentEstimate.jobId);
      setCurrentEstimate(updated);
    } catch (error) {
      console.error('Failed to reorder items:', error);
    }
  };

  const handleGeneratePDF = async () => {
    if (!currentEstimate) return;

    // Save first
    await handleSaveEstimate();

    try {
      const filePath = await GenerateEstimatePDF(currentEstimate.jobId);
      await OpenFileInDefaultApp(filePath);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const resetForm = () => {
    setCurrentEstimate(null);
    setSelectedCustomerId(0);
    setJobName('');
    setMarkupPercent(0);
    setInstallQty(0);
    setInstallRate(0);
    setMiscCharge(0);
    setSelectedCategoryId(0);
    setSelectedItemId(0);
    setItemQuantity('1');
    setWriteInName('');
    setWriteInQty('1');
    setWriteInPrice('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  // List View
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Estimates</h2>
        <Button
          onClick={() => {
            resetForm();
            setViewMode('edit');
          }}
        >
          <Plus size={16} className="mr-2" />
          New Estimate
        </Button>
      </div>

        {estimates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400">
                No estimates yet. Create your first estimate to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Job Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((estimate) => (
                      <tr
                        key={estimate.jobId}
                        className="border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer"
                        onClick={() => loadEstimate(estimate.jobId)}
                      >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                        {estimate.jobName}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {estimate.customer?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {formatDate(estimate.estimateDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100 text-right">
                        {formatCurrency(estimate.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEstimate(estimate.jobId);
                          }}
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Edit View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              resetForm();
              setViewMode('list');
            }}
          >
            <ChevronLeft size={16} className="mr-1" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-zinc-100">
            {currentEstimate ? 'Edit Estimate' : 'New Estimate'}
          </h2>
        </div>
        {currentEstimate && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSaveEstimate}>
              <Save size={16} className="mr-2" />
              Save
            </Button>
            <Button onClick={handleGeneratePDF}>
              <FileText size={16} className="mr-2" />
              Generate PDF
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="col-span-2 space-y-4">
          {/* Customer & Job Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Customer"
                  value={selectedCustomerId.toString()}
                  onChange={(value) => setSelectedCustomerId(parseInt(value) || 0)}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder="Select customer..."
                />
                <Input
                  label="Job Name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g., Kitchen Remodel"
                />
              </div>
              {!currentEstimate && (
                <div className="mt-4">
                  <Button onClick={handleCreateEstimate}>Create Estimate</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {currentEstimate && (
            <>
              {/* Add from Price List */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-zinc-100">Add from Price List</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 items-end">
                    <Select
                      label="Category"
                      value={selectedCategoryId.toString()}
                      onChange={(value) => {
                        setSelectedCategoryId(parseInt(value) || 0);
                        setSelectedItemId(0);
                      }}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      placeholder="Select category..."
                      className="flex-1"
                    />
                    <Select
                      label="Item"
                      value={selectedItemId.toString()}
                      onChange={(value) => setSelectedItemId(parseInt(value) || 0)}
                      options={categoryItems.map((i) => ({
                        value: i.id,
                        label: `${i.itemName} - ${formatCurrency(i.unitPrice)}`,
                      }))}
                      placeholder="Select item..."
                      disabled={!selectedCategoryId}
                      className="flex-1"
                    />
                    <Input
                      label="Qty"
                      type="number"
                      step="1"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={handleAddPriceListItem} disabled={!selectedItemId}>
                      <Plus size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Write-In Item */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-zinc-100">Add Write-In Item</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 items-end">
                    <Input
                      label="Description"
                      value={writeInName}
                      onChange={(e) => setWriteInName(e.target.value)}
                      placeholder="Custom item description"
                      className="flex-1"
                    />
                    <Input
                      label="Qty"
                      type="number"
                      step="1"
                      min="1"
                      value={writeInQty}
                      onChange={(e) => setWriteInQty(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      label="Price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={writeInPrice}
                      onChange={(e) => setWriteInPrice(e.target.value)}
                      className="w-28"
                    />
                    <Button
                      onClick={handleAddWriteInItem}
                      disabled={!writeInName.trim()}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <div>
                <h3 className="font-semibold text-zinc-100 mb-2">Line Items</h3>
                <LineItemTable
                  lineItems={currentEstimate.lineItems || []}
                  onDeleteItem={handleDeleteLineItem}
                  onReorderItems={handleReorderLineItems}
                />
              </div>
            </>
          )}
        </div>

        {/* Totals - 1 column */}
        {currentEstimate && (
          <div>
            <TotalsCard
              subtotal={subtotal}
              markupPercent={markupPercent}
              installQty={installQty}
              installRate={installRate}
              miscCharge={miscCharge}
              onMarkupChange={setMarkupPercent}
              onInstallQtyChange={setInstallQty}
              onInstallRateChange={setInstallRate}
              onMiscChargeChange={setMiscCharge}
            />
          </div>
        )}
      </div>
    </div>
  );
}
