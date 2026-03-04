import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Printer, Save, ChevronLeft, Trash2, FileText, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StatusBadge } from '../ui/StatusBadge';
import { CustomerCombobox } from '../ui/CustomerCombobox';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { LineItemTable } from './LineItemTable';
import { TotalsCard } from './TotalsCard';
import { formatCurrency, formatDate } from '../../lib/utils';
import { buildPrintDocumentHtml } from '../../lib/printHtml';
import type {
  CompanySettings,
  Customer,
  Category,
  EstimateJob,
  SortOrderUpdate,
  CreateLineItemRequest,
} from '../../types';
import {
  GetAllCustomers,
  GetAllCategoriesWithItems,
  GetEstimatesPage,
  GetEstimate,
  CreateEstimate,
  UpdateEstimate,
  DeleteEstimate,
  DuplicateEstimate,
  AddLineItem,
  DeleteLineItem,
  UpdateLineItem,
  UpdateLineItemSortOrder,
  GenerateEstimatePDF,
  OpenFileInDefaultApp,
  GetCompanySettings,
} from '../../../wailsjs/go/main/App';

type ViewMode = 'list' | 'edit';

interface QuickCreateForCustomer {
  customerId: number;
  customerName: string;
  token: number;
}

interface EstimateGeneratorProps {
  quickCreateForCustomer?: QuickCreateForCustomer | null;
  onQuickCreateHandled?: () => void;
  openEstimateRecord?: {
    id: number;
    token: number;
  } | null;
  onOpenEstimateHandled?: () => void;
  statusRequest?: {
    status: string;
    token: number;
  } | null;
  onStatusRequestHandled?: () => void;
}

const customCabinetStatuses = ['draft', 'quoted', 'approved', 'in-progress', 'installed', 'closed'] as const;

export function EstimateGenerator({
  quickCreateForCustomer,
  onQuickCreateHandled,
  openEstimateRecord,
  onOpenEstimateHandled,
  statusRequest,
  onStatusRequestHandled,
}: EstimateGeneratorProps) {
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  const [totalEstimates, setTotalEstimates] = useState(0);
  const [currentEstimate, setCurrentEstimate] = useState<EstimateJob | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<EstimateJob | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastHandledQuickCreateToken, setLastHandledQuickCreateToken] = useState<number | null>(null);
  const [lastHandledOpenToken, setLastHandledOpenToken] = useState<number | null>(null);
  const [lastHandledStatusToken, setLastHandledStatusToken] = useState<number | null>(null);
  const [isCreatingCustomCabinet, setIsCreatingCustomCabinet] = useState(false);
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

  const fetchStaticData = async () => {
    try {
      const [customersData, categoriesData, settingsData] = await Promise.all([
        GetAllCustomers(),
        GetAllCategoriesWithItems(),
        GetCompanySettings(),
      ]);
      setCustomers(customersData || []);
      setCategories(categoriesData || []);
      setCompanySettings((settingsData || null) as CompanySettings | null);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchEstimatesPage = async (page = currentPage, search = searchTerm, size = pageSize, status = statusFilter) => {
    try {
      const response = await GetEstimatesPage({ page, pageSize: size, search, status });
      setEstimates(response?.items || []);
      setTotalEstimates(response?.total || 0);
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchStaticData();
      await fetchEstimatesPage();
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (loading || viewMode !== 'list') {
      return;
    }
    void fetchEstimatesPage();
  }, [currentPage, searchTerm, statusFilter, viewMode, pageSize]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryItems = selectedCategory?.items || [];
  const activeCustomers = useMemo(
    () => customers.filter((customer) => !customer.archived),
    [customers]
  );
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;

  const subtotal = useMemo(() => {
    return (currentEstimate?.lineItems || []).reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
  }, [currentEstimate?.lineItems]);

  const installTotal = installQty * installRate;
  const markupAmountRaw = subtotal * (markupPercent / 100);
  const markupAmount = markupAmountRaw > 0 ? Math.ceil(markupAmountRaw / 5) * 5 : 0;
  const grandTotalRaw = subtotal + markupAmount + installTotal + miscCharge;
  const grandTotal = grandTotalRaw > 0 ? Math.ceil(grandTotalRaw / 5) * 5 : 0;

  const totalPages = Math.max(1, Math.ceil(totalEstimates / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadEstimate = async (jobId: number) => {
    try {
      const estimate = await GetEstimate(jobId);
      if (estimate) {
        setCurrentEstimate(estimate);
        setIsCreatingCustomCabinet(false);
        setSelectedCustomerId(estimate.customerId);
        setJobName(estimate.jobName);
        setMarkupPercent(estimate.markupPercent);
        if (estimate.installQty > 0 || estimate.installRate > 0) {
          setInstallQty(estimate.installQty || 0);
          setInstallRate(estimate.installRate || 0);
        } else {
          setInstallQty(0);
          setInstallRate(estimate.installTotal || 0);
          if (estimate.installTotal > 0) {
            setInstallQty(1);
          }
        }
        setMiscCharge(estimate.miscCharge);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('Failed to load estimate:', error);
      showToast('Failed to load estimate', 'error');
    }
  };

  const handleCreateDraftEstimate = async (customerIdOverride?: number, jobNameOverride?: string) => {
    const targetCustomerId = customerIdOverride ?? 0;
    const targetJobName = (jobNameOverride ?? 'New Custom Cabinet').trim() || 'New Custom Cabinet';

    try {
      setSelectedCustomerId(targetCustomerId);
      setJobName(targetJobName);

      const estimate = await CreateEstimate({
        customerId: targetCustomerId,
        jobName: targetJobName,
        status: 'draft',
        installQty: 0,
        installRate: 0,
        markupPercent: 0,
        miscCharge: 0,
      });
      if (estimate) {
        setCurrentEstimate(estimate);
        setIsCreatingCustomCabinet(true);
        setViewMode('edit');
        await fetchEstimatesPage();
        showToast('Estimate created', 'success');
      }
    } catch (error) {
      console.error('Failed to create estimate:', error);
      showToast('Failed to create estimate', 'error');
    }
  };

  useEffect(() => {
    if (!quickCreateForCustomer || loading) {
      return;
    }

    if (quickCreateForCustomer.token === lastHandledQuickCreateToken) {
      return;
    }

    setLastHandledQuickCreateToken(quickCreateForCustomer.token);
    void handleCreateDraftEstimate(quickCreateForCustomer.customerId, 'New Custom Cabinet');
    onQuickCreateHandled?.();
  }, [quickCreateForCustomer, loading, lastHandledQuickCreateToken, onQuickCreateHandled]);

  useEffect(() => {
    if (!openEstimateRecord || loading) {
      return;
    }

    if (openEstimateRecord.token === lastHandledOpenToken) {
      return;
    }

    setLastHandledOpenToken(openEstimateRecord.token);
    void loadEstimate(openEstimateRecord.id);
    onOpenEstimateHandled?.();
  }, [openEstimateRecord, loading, lastHandledOpenToken, onOpenEstimateHandled]);

  useEffect(() => {
    if (!statusRequest || loading) {
      return;
    }

    if (statusRequest.token === lastHandledStatusToken) {
      return;
    }

    setLastHandledStatusToken(statusRequest.token);
    setStatusFilter(statusRequest.status || 'all');
    setCurrentPage(1);
    setViewMode('list');
    onStatusRequestHandled?.();
  }, [statusRequest, loading, lastHandledStatusToken, onStatusRequestHandled]);

  const handleSaveEstimate = async (showSuccessMessage = true) => {
    if (!currentEstimate) return;

    try {
      const updatedEstimate = await UpdateEstimate({
        jobId: currentEstimate.jobId,
        customerId: selectedCustomerId,
        jobName: jobName.trim(),
        status: currentEstimate.status || 'draft',
        totalAmount: grandTotal,
        installTotal: installTotal,
        installQty,
        installRate,
        markupPercent,
        miscCharge,
      });
      if (updatedEstimate) {
        setCurrentEstimate(updatedEstimate);
      }
      setIsCreatingCustomCabinet(false);
      await fetchEstimatesPage();
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
        setIsCreatingCustomCabinet(false);
        setViewMode('list');
      }
      await fetchEstimatesPage();
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

  const handleDuplicateEstimate = async (jobId: number) => {
    try {
      const duplicated = await DuplicateEstimate(jobId);
      const nextEstimate = (duplicated as EstimateJob) || null;
      if (nextEstimate?.jobId) {
        await fetchEstimatesPage();
        await loadEstimate(nextEstimate.jobId);
        showToast('Custom cabinet duplicated', 'success');
      }
    } catch (error) {
      console.error('Failed to duplicate custom cabinet:', error);
      showToast('Failed to duplicate custom cabinet', 'error');
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

  const handleStatusChange = (status: string) => {
    if (!currentEstimate) return;
    setCurrentEstimate({ ...currentEstimate, status });
  };

  const handleUpdateLineItem = async (
    id: number,
    itemName: string,
    quantity: number,
    unitPrice: number,
    categoryName: string
  ) => {
    if (!currentEstimate) return;

    try {
      await UpdateLineItem({
        id,
        itemName,
        categoryName,
        quantity,
        unitPrice,
      });
      const updated = await GetEstimate(currentEstimate.jobId);
      setCurrentEstimate(updated);
    } catch (error) {
      console.error('Failed to update line item:', error);
      showToast('Failed to update line item', 'error');
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

  const handleSaveEstimatePDF = async () => {
    if (!currentEstimate) return;

    await handleSaveEstimate(false);

    let filePath = '';
    try {
      const printHtml = buildPrintDocumentHtml();
      filePath = await GenerateEstimatePDF(currentEstimate.jobId, printHtml);
      showToast('PDF saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save estimate PDF:', error);
      showToast(`Failed to save PDF: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return;
    }

    if (companySettings?.openPdfAfterSave ?? true) {
      try {
        await OpenFileInDefaultApp(filePath);
      } catch (error) {
        console.error('PDF saved but failed to open estimate PDF:', error);
        showToast('PDF saved, but could not open automatically. Open it from the folder.', 'error');
      }
    }
  };

  const handleQuickPrintEstimate = async (jobId: number) => {
    await loadEstimate(jobId);

    setTimeout(() => {
      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        resetForm();
        setViewMode('list');
      };

      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }, 60);
  };

  const handleCancelNewCustomCabinet = async () => {
    if (!currentEstimate || !isCreatingCustomCabinet) return;

    try {
      await DeleteEstimate(currentEstimate.jobId);
      resetForm();
      setViewMode('list');
      await fetchEstimatesPage();
      showToast('Custom cabinet cancelled', 'success');
    } catch (error) {
      console.error('Failed to cancel custom cabinet:', error);
      showToast('Failed to cancel custom cabinet', 'error');
    }
  };

  const resetForm = () => {
    setCurrentEstimate(null);
    setIsCreatingCustomCabinet(false);
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
        <h2 className="text-2xl font-bold text-zinc-100">Custom Cabinets</h2>
        <Button onClick={() => void handleCreateDraftEstimate()}>
          <Plus size={16} className="mr-2" />
          New Custom Cabinet
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_180px] gap-2">
        <Input
          placeholder="Search custom cabinets by job, customer, or date"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Statuses' },
            ...customCabinetStatuses.map((status) => ({
              value: status,
              label: status.charAt(0).toUpperCase() + status.slice(1),
            })),
          ]}
        />
      </div>

        {totalEstimates === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400">
                {searchTerm.trim()
                  ? 'No custom cabinets match your search.'
                  : 'No estimates yet. Create your first estimate to get started.'}
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
                      Status
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
                        <StatusBadge status={estimate.status} kind="estimate" />
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
                             void handleQuickPrintEstimate(estimate.jobId);
                           }}
                         >
                           <Printer size={14} className="text-zinc-400" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             void handleDuplicateEstimate(estimate.jobId);
                           }}
                           title="Duplicate custom cabinet"
                         >
                           <Copy size={14} className="text-zinc-400" />
                         </Button>
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
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-400">Rows</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 10)}
                  className="px-2 py-1 text-xs border border-zinc-600 rounded bg-zinc-800 text-zinc-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <p className="text-xs text-zinc-400">
                  Showing {totalEstimates === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalEstimates)} of {totalEstimates}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <p className="text-xs text-zinc-400">
                  Page {currentPage} of {totalPages}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
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
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[22px] font-bold leading-tight">
                  {currentEstimate.customer?.name || selectedCustomer?.name || '-'}
                  <span className="text-[14px] font-normal"> - {jobName || currentEstimate.jobName || '-'}</span>
                </p>
                <p className="text-sm mt-1">{formatDate(currentEstimate.estimateDate)}</p>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-right">Custom Cabinets</h1>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left text-sm font-semibold px-3 py-2">
                    Description
                  </th>
                  <th className="text-right text-sm font-semibold px-3 py-2 w-24">
                    Qty
                  </th>
                  <th className="text-right text-sm font-semibold px-3 py-2 w-32">
                    Unit Price
                  </th>
                  <th className="text-right text-sm font-semibold px-3 py-2 w-32">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {(currentEstimate.lineItems || []).map((item) => (
                  <tr key={item.id} className="border-b border-black/30">
                    <td className="text-sm px-3 py-2">
                      {item.categoryName ? `${item.categoryName} - ` : ''}
                      {item.itemName}
                    </td>
                    <td className="text-sm text-right px-3 py-2">{item.quantity}</td>
                    <td className="text-sm text-right px-3 py-2">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-sm text-right px-3 py-2">
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
                  <span>Markup ({markupPercent}%)</span>
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
              <div className="flex justify-between text-base font-bold pt-2 border-t border-black">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

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
              {isCreatingCustomCabinet && (
                <Button variant="ghost" onClick={() => void handleCancelNewCustomCabinet()}>
                  Cancel
                </Button>
              )}
              <Button variant="secondary" onClick={() => void handleSaveEstimate()}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
              <Button variant="secondary" onClick={() => void handleSaveEstimatePDF()}>
                <FileText size={16} className="mr-2" />
                Save PDF
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
                <div className="grid grid-cols-3 gap-4">
                  <CustomerCombobox
                    label="Customer"
                    customers={activeCustomers}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    placeholder="Search customer..."
                  />
                  <Input
                    label="Job Name"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="e.g., Kitchen Remodel"
                  />
                  <Select
                    label="Status"
                    value={currentEstimate?.status || 'draft'}
                    onChange={handleStatusChange}
                    options={customCabinetStatuses.map((status) => ({
                      value: status,
                      label: status.charAt(0).toUpperCase() + status.slice(1),
                    }))}
                  />
                </div>
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
                  categories={categories}
                  onDeleteItem={handleDeleteLineItem}
                  onUpdateItem={handleUpdateLineItem}
                  onReorderItems={handleReorderLineItems}
                />
              </div>
            </>
          )}
        </div>

          {currentEstimate && (
            <div className="self-start sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
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
    </>
  );
}
