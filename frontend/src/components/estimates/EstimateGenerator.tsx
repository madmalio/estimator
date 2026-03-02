import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Printer, Save, ChevronLeft, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { LineItemTable } from './LineItemTable';
import { TotalsCard } from './TotalsCard';
import { formatCurrency, formatDate } from '../../lib/utils';
import type {
  Customer,
  Category,
  EstimateJob,
  CompanySettings,
  SortOrderUpdate,
  CreateLineItemRequest,
  TaxRate,
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
  GetCompanySettings,
  GetAllTaxRates,
} from '../../../wailsjs/go/main/App';

type ViewMode = 'list' | 'edit';

export function EstimateGenerator() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>('');
  const [currentEstimate, setCurrentEstimate] = useState<EstimateJob | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<EstimateJob | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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
      const [customersData, categoriesData, estimatesData, companySettingsData, taxRatesData] = await Promise.all([
        GetAllCustomers(),
        GetAllCategoriesWithItems(),
        GetAllEstimates(),
        GetCompanySettings(),
        GetAllTaxRates(),
      ]);
      setCustomers(customersData || []);
      setCategories(categoriesData || []);
      setEstimates(estimatesData || []);
      setCompanySettings(companySettingsData || null);
      setTaxRates(taxRatesData || []);

      const defaultRate = (taxRatesData || []).find(r => r.isDefault);
      if (defaultRate && !selectedTaxRateId) {
        setSelectedTaxRateId(defaultRate.id.toString());
      }
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
  const activeCustomer =
    currentEstimate?.customer || customers.find((c) => c.id === selectedCustomerId) || null;

  const subtotal = useMemo(() => {
    return (currentEstimate?.lineItems || []).reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
  }, [currentEstimate?.lineItems]);

  const installTotal = installQty * installRate;
  const markupAmount = subtotal * (markupPercent / 100);
  
  const selectedTaxRate = taxRates.find(r => r.id.toString() === selectedTaxRateId);
  const taxAmount = selectedTaxRate ? (subtotal + markupAmount + installTotal + miscCharge) * (selectedTaxRate.rate / 100) : 0;
  
  const grandTotal = subtotal + markupAmount + installTotal + miscCharge + taxAmount;

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
      showToast('Failed to load estimate', 'error');
    }
  };

  const handleCreateEstimate = async () => {
    if (!selectedCustomerId || !jobName.trim()) {
      showToast('Please select a customer and enter a job name', 'error');
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
        showToast('Estimate created', 'success');
      }
    } catch (error) {
      console.error('Failed to create estimate:', error);
      showToast('Failed to create estimate', 'error');
    }
  };

  const handleSaveEstimate = async (showSuccessMessage = true) => {
    if (!currentEstimate) return;

    try {
      const updatedEstimate = await UpdateEstimate({
        jobId: currentEstimate.jobId,
        customerId: selectedCustomerId,
        jobName: jobName.trim(),
        totalAmount: grandTotal,
        installTotal: installTotal,
        markupPercent,
        miscCharge,
      });
      if (updatedEstimate) {
        setCurrentEstimate(updatedEstimate);
      }
      await fetchData();
      if (showSuccessMessage) {
        showToast('Estimate saved', 'success');
      }
    } catch (error) {
      console.error('Failed to save estimate:', error);
      showToast('Failed to save estimate', 'error');
    }
  };

  const handleDeleteEstimate = async () => {
    if (!estimateToDelete) return;

    try {
      await DeleteEstimate(estimateToDelete.jobId);
      if (currentEstimate?.jobId === estimateToDelete.jobId) {
        setCurrentEstimate(null);
        setViewMode('list');
      }
      await fetchData();
      showToast('Estimate deleted', 'success');
    } catch (error) {
      console.error('Failed to delete estimate:', error);
      showToast('Failed to delete estimate', 'error');
    } finally {
      setEstimateToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const openDeleteEstimateModal = (estimate: EstimateJob) => {
    setEstimateToDelete(estimate);
    setIsDeleteModalOpen(true);
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
      showToast('Failed to add line item', 'error');
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
      showToast('Failed to add write-in item', 'error');
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
      showToast('Failed to delete line item', 'error');
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
      showToast('Failed to reorder items', 'error');
    }
  };

  const handlePrintEstimate = async () => {
    if (!currentEstimate) return;

    // Save first so printed totals and details are persisted
    await handleSaveEstimate(false);

    window.print();
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
    setSelectedTaxRateId('');
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
                            openDeleteEstimateModal(estimate);
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

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setEstimateToDelete(null);
            setIsDeleteModalOpen(false);
          }}
          title="Delete Estimate"
        >
          <div className="space-y-4">
            <p className="text-zinc-300">
              Are you sure you want to delete
              {estimateToDelete ? ` "${estimateToDelete.jobName}"` : ' this estimate'}?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEstimateToDelete(null);
                  setIsDeleteModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteEstimate}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Edit View
  return (
    <>
      {currentEstimate && (
        <section className="print-only">
          <div className="max-w-[850px] mx-auto p-10 text-black bg-white">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {companySettings?.companyName || 'Cabinet Estimator'}
                </h1>
                {companySettings?.addressLine1 && (
                  <p className="text-sm mt-1">{companySettings.addressLine1}</p>
                )}
                {companySettings?.addressLine2 && (
                  <p className="text-sm">{companySettings.addressLine2}</p>
                )}
                {(companySettings?.phone || companySettings?.email) && (
                  <p className="text-sm">
                    {companySettings?.phone || ''}
                    {companySettings?.phone && companySettings?.email ? ' | ' : ''}
                    {companySettings?.email || ''}
                  </p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-semibold">ESTIMATE</h2>
                <p className="text-sm mt-2">Estimate #: {currentEstimate.jobId}</p>
                <p className="text-sm">Date: {formatDate(currentEstimate.estimateDate)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-2">Customer</h3>
                <p className="text-sm font-medium">{activeCustomer?.name || '-'}</p>
                <p className="text-sm">{activeCustomer?.address || ''}</p>
                <p className="text-sm">{activeCustomer?.phone || ''}</p>
                <p className="text-sm">{activeCustomer?.email || ''}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-2">Project</h3>
                <p className="text-sm font-medium">{jobName || currentEstimate.jobName}</p>
              </div>
            </div>

            <table className="w-full border border-black border-collapse mb-6">
              <thead>
                <tr>
                  <th className="text-left text-sm font-semibold border border-black px-3 py-2">
                    Description
                  </th>
                  <th className="text-right text-sm font-semibold border border-black px-3 py-2 w-24">
                    Qty
                  </th>
                  <th className="text-right text-sm font-semibold border border-black px-3 py-2 w-32">
                    Unit Price
                  </th>
                  <th className="text-right text-sm font-semibold border border-black px-3 py-2 w-32">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {(currentEstimate.lineItems || []).map((item) => (
                  <tr key={item.id}>
                    <td className="text-sm border border-black px-3 py-2">
                      {item.categoryName ? `${item.categoryName} - ` : ''}
                      {item.itemName}
                    </td>
                    <td className="text-sm text-right border border-black px-3 py-2">{item.quantity}</td>
                    <td className="text-sm text-right border border-black px-3 py-2">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-sm text-right border border-black px-3 py-2">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {markupPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Markup ({markupPercent.toFixed(2)}%)</span>
                  <span>{formatCurrency(markupAmount)}</span>
                </div>
              )}
              {installTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Installation</span>
                  <span>{formatCurrency(installTotal)}</span>
                </div>
              )}
              {miscCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Misc. Charges</span>
                  <span>{formatCurrency(miscCharge)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({selectedTaxRate?.name})</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-black">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <p className="text-xs mt-10">This estimate is valid for 30 days from the date listed above.</p>
          </div>
        </section>
      )}

      <div className="space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              className="no-print"
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
            <div className="flex gap-2 no-print">
              <Button variant="secondary" onClick={() => void handleSaveEstimate()}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
              <Button onClick={handlePrintEstimate}>
                <Printer size={16} className="mr-2" />
                Print
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
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
              <Card className="no-print">
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
              <Card className="no-print">
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

          {currentEstimate && (
            <div>
              <TotalsCard
                subtotal={subtotal}
                markupPercent={markupPercent}
                installQty={installQty}
                installRate={installRate}
                miscCharge={miscCharge}
                taxRateId={selectedTaxRateId}
                taxRates={taxRates}
                onMarkupChange={setMarkupPercent}
                onInstallQtyChange={setInstallQty}
                onInstallRateChange={setInstallRate}
                onMiscChargeChange={setMiscCharge}
                onTaxRateChange={setSelectedTaxRateId}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
