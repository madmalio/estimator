import React, { useEffect, useMemo, useState } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Plus, ChevronLeft, Trash2, Save, Printer, FileText } from 'lucide-react';
import { SortableList } from '../dnd/SortableList';
import { DragHandle } from '../dnd/DragHandle';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CustomerCombobox } from '../ui/CustomerCombobox';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import { buildPrintDocumentHtml } from '../../lib/printHtml';
import type {
  CompanySettings,
  Customer,
  EstimateJob,
  ManualQuote,
  ManualQuoteLineItem,
  ManualQuoteLineItemRequest,
  TaxRate,
} from '../../types';
import { types as wailsTypes } from '../../../wailsjs/go/models';
import {
  GetAllCustomers,
  GetManualQuotesPage,
  GetManualQuote,
  GetCompanySettings,
  CreateManualQuote,
  UpdateManualQuote,
  DeleteManualQuote,
  GetAllTaxRates,
  GetAllEstimates,
  GenerateProposalPDF,
  OpenFileInDefaultApp,
} from '../../../wailsjs/go/main/App';

type ViewMode = 'list' | 'edit';

interface QuickCreateForCustomer {
  customerId: number;
  customerName: string;
  token: number;
}

interface ProposalsViewProps {
  quickCreateForCustomer?: QuickCreateForCustomer | null;
  onQuickCreateHandled?: () => void;
}

interface ManualQuoteFormState {
  customerId: number;
  jobName: string;
  lineItems: EditableLineItem[];
  notes: EditableQuoteNote[];
  paymentSchedule: string;
  includeTotals: boolean;
  subtotal: number;
  tax: number;
  total: number;
  depositPercent: number;
  depositAmount: number;
  amountDue: number;
}

interface QuoteNote {
  text: string;
  includeInitials: boolean;
}

interface EditableQuoteNote extends QuoteNote {
  clientId: string;
}

interface EditableLineItem extends ManualQuoteLineItemRequest {
  clientId: string;
}

interface SortableEditableRowProps {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

interface DraftLineItemState {
  itemName: string;
  description: string;
  lineTotal: string;
}

interface DraftNoteState {
  text: string;
  includeInitials: boolean;
}

const defaultTermsBlock1 =
  'Pricing is subject to change without notice. All material is guaranteed to be as specified, and the above work to be performed in accordance with the drawings and specifications submitted for above work and completed in a substantial workmanlike manner. One year warranty on labor and material.';
const defaultTermsBlock2 =
  'A FINANCE CHARGE is computed by applying a "period rate" of 1.5% per month which is an annual rate of 18% on Past Due Accounts.';
const defaultTermsBlock3 =
  'Any Collection charges or legal fees must be paid by the customer. A 25% restocking charge must be paid on all cancelled orders. RETURN CHECK CHARGE $25.00.';
const defaultPaymentsNote = 'Payments to be made as follows: 75% Deposit';
const defaultCreditCardNote = '* THERE WILL BE A 3% FEE ADDED TO ALL CREDIT CARD TRANSACTIONS *';
const defaultSignatureNote =
  'By signing this document, the customer agrees to the services and conditions outlined in this document.';

const defaultForm: ManualQuoteFormState = {
  customerId: 0,
  jobName: 'New Proposal',
  lineItems: [],
  notes: [],
  paymentSchedule: '',
  includeTotals: true,
  subtotal: 0,
  tax: 0,
  total: 0,
  depositPercent: 75,
  depositAmount: 0,
  amountDue: 0,
};

const defaultDraftLineItem: DraftLineItemState = {
  itemName: '',
  description: '',
  lineTotal: '',
};

const defaultDraftNote: DraftNoteState = {
  text: '',
  includeInitials: false,
};

function createClientId(prefix: 'item' | 'note'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseQuoteMeta(
  descriptionBody: string
): { notes: EditableQuoteNote[]; includeTotals: boolean; paymentSchedule: string } {
  if (!descriptionBody || !descriptionBody.trim()) {
    return { notes: [], includeTotals: true, paymentSchedule: '' };
  }

  try {
    const parsed = JSON.parse(descriptionBody) as {
      notes?: QuoteNote[];
      includeTotals?: boolean;
      paymentSchedule?: string;
    };
    if (Array.isArray(parsed?.notes)) {
      return {
        notes: parsed.notes
        .filter((note) => note && typeof note.text === 'string')
        .map((note) => ({
          clientId: createClientId('note'),
          text: note.text,
          includeInitials: Boolean(note.includeInitials),
        })),
        includeTotals: parsed.includeTotals !== false,
        paymentSchedule: parsed.paymentSchedule || '',
      };
    }
  } catch {
    return {
      notes: [{ clientId: createClientId('note'), text: descriptionBody, includeInitials: false }],
      includeTotals: true,
      paymentSchedule: '',
    };
  }

  return { notes: [], includeTotals: true, paymentSchedule: '' };
}

function stringifyQuoteMeta(notes: EditableQuoteNote[], includeTotals: boolean, paymentSchedule: string): string {
  if (notes.length === 0 && includeTotals && !paymentSchedule.trim()) {
    return '';
  }

  return JSON.stringify({
    notes: notes.map((note) => ({
      text: note.text,
      includeInitials: note.includeInitials,
    })),
    includeTotals,
    paymentSchedule,
  });
}

function getDefaultPaymentSchedule(paymentsNote: string): string {
  const prefix = 'Payments to be made as follows:';
  if (!paymentsNote) return '';
  if (paymentsNote.startsWith(prefix)) {
    return paymentsNote.slice(prefix.length).trim();
  }
  return paymentsNote.trim();
}

function formatPercentValue(percent: number): string {
  const normalized = Number(percent.toFixed(2));
  return Number.isInteger(normalized) ? `${normalized}` : `${normalized}`;
}

function quoteToForm(quote: ManualQuote): ManualQuoteFormState {
  const meta = parseQuoteMeta(quote.descriptionBody || '');

  return {
    customerId: quote.customerId || 0,
    jobName: quote.jobName || '',
    lineItems: (quote.lineItems || [])
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item: ManualQuoteLineItem) => ({
      clientId: createClientId('item'),
      itemName: item.itemName || '',
      description: item.description || '',
      lineTotal: item.lineTotal || 0,
      sortOrder: item.sortOrder || 0,
    })),
    notes: meta.notes,
    paymentSchedule: meta.paymentSchedule,
    includeTotals: meta.includeTotals,
    subtotal: quote.subtotal || 0,
    tax: quote.tax || 0,
    total: quote.total || 0,
    depositPercent: quote.depositPercent || 0,
    depositAmount: quote.depositAmount || 0,
    amountDue: quote.amountDue || 0,
  };
}

export function ProposalsView({ quickCreateForCustomer, onQuickCreateHandled }: ProposalsViewProps) {
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [quotes, setQuotes] = useState<ManualQuote[]>([]);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>('');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [currentQuote, setCurrentQuote] = useState<ManualQuote | null>(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [form, setForm] = useState<ManualQuoteFormState>(defaultForm);
  const [draftLineItem, setDraftLineItem] = useState<DraftLineItemState>(defaultDraftLineItem);
  const [isCustomCabinetSuggestionsOpen, setIsCustomCabinetSuggestionsOpen] = useState(false);
  const [draftNote, setDraftNote] = useState<DraftNoteState>(defaultDraftNote);
  const [quoteToDelete, setQuoteToDelete] = useState<ManualQuote | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastHandledQuickCreateToken, setLastHandledQuickCreateToken] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId),
    [customers, form.customerId]
  );
  const activeCustomers = useMemo(
    () => customers.filter((customer) => !customer.archived),
    [customers]
  );
  const proposalDefaults = useMemo(
    () => ({
      termsBlock1: companySettings?.defaultTermsBlock1 || defaultTermsBlock1,
      termsBlock2: companySettings?.defaultTermsBlock2 || defaultTermsBlock2,
      termsBlock3: companySettings?.defaultTermsBlock3 || defaultTermsBlock3,
      paymentsNote: companySettings?.defaultPaymentsNote || defaultPaymentsNote,
      creditCardNote: companySettings?.defaultCreditCardNote || defaultCreditCardNote,
      signatureNote: companySettings?.defaultSignatureNote || defaultSignatureNote,
    }),
    [companySettings]
  );
  const quoteDateText = currentQuote?.quoteDate
    ? formatDate(currentQuote.quoteDate)
    : formatDate(new Date().toISOString());
  const matchingCustomCabinetJobs = useMemo(() => {
    if (!selectedCustomer?.name) {
      return [];
    }

    const customerName = selectedCustomer.name.trim().toLowerCase();
    return estimates.filter((estimate) => {
      const estimateCustomerName = estimate.customer?.name?.trim().toLowerCase();
      return Boolean(estimateCustomerName) && estimateCustomerName === customerName;
    });
  }, [estimates, selectedCustomer]);
  const filteredCustomCabinetSuggestions = useMemo(() => {
    if (!form.customerId) {
      return [];
    }

    const query = draftLineItem.itemName.trim().toLowerCase();
    if (!query) {
      return matchingCustomCabinetJobs;
    }

    return matchingCustomCabinetJobs.filter((estimate) =>
      estimate.jobName.toLowerCase().includes(query) ||
      'custom cabinets'.includes(query)
    );
  }, [form.customerId, draftLineItem.itemName, matchingCustomCabinetJobs]);
  const lineItemsSubtotal = useMemo(
    () => form.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0),
    [form.lineItems]
  );
  const autoTotal = useMemo(() => Number((form.subtotal + form.tax).toFixed(2)), [form.subtotal, form.tax]);
  const autoDepositAmount = useMemo(
    () => Number((form.total * (form.depositPercent / 100)).toFixed(2)),
    [form.total, form.depositPercent]
  );
  const autoAmountDue = useMemo(
    () => Number((form.total - form.depositAmount).toFixed(2)),
    [form.total, form.depositAmount]
  );
  const totalPages = Math.max(1, Math.ceil(totalQuotes / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setForm((prev) => (prev.total === autoTotal ? prev : { ...prev, total: autoTotal }));
  }, [autoTotal]);

  useEffect(() => {
    setForm((prev) => (prev.amountDue === autoAmountDue ? prev : { ...prev, amountDue: autoAmountDue }));
  }, [autoAmountDue]);

  useEffect(() => {
    setForm((prev) => (prev.depositAmount === autoDepositAmount ? prev : { ...prev, depositAmount: autoDepositAmount }));
  }, [autoDepositAmount]);

  useEffect(() => {
    setForm((prev) => (prev.subtotal === lineItemsSubtotal ? prev : { ...prev, subtotal: lineItemsSubtotal }));
  }, [lineItemsSubtotal]);

  useEffect(() => {
    if (selectedTaxRateId) {
      const rate = taxRates.find((r) => r.id.toString() === selectedTaxRateId);
      if (rate) {
        const calculatedTax = Number((form.subtotal * (rate.rate / 100)).toFixed(2));
        setForm((prev) => ({ ...prev, tax: calculatedTax }));
      }
    }
  }, [selectedTaxRateId, form.subtotal, taxRates]);

  const fetchStaticData = async () => {
    try {
      const [customersData, companySettingsData, taxRatesData, estimatesData] = await Promise.all([
        GetAllCustomers(),
        GetCompanySettings(),
        GetAllTaxRates(),
        GetAllEstimates(),
      ]);
      setCustomers((customersData || []) as Customer[]);
      setCompanySettings((companySettingsData || null) as CompanySettings | null);
      setTaxRates((taxRatesData || []) as TaxRate[]);
      setEstimates((estimatesData || []) as EstimateJob[]);
    } catch (error) {
      console.error('Failed to fetch manual quote data:', error);
      showToast('Failed to fetch manual quote data', 'error');
    }
  };

  const fetchQuotesPage = async (page = currentPage, search = searchTerm, size = pageSize) => {
    try {
      const response = await GetManualQuotesPage({ page, pageSize: size, search });
      setQuotes((response?.items || []) as ManualQuote[]);
      setTotalQuotes(response?.total || 0);
    } catch (error) {
      console.error('Failed to fetch manual quote list:', error);
      showToast('Failed to fetch manual quote list', 'error');
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchStaticData();
      await fetchQuotesPage();
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (loading || viewMode !== 'list') {
      return;
    }
    void fetchQuotesPage();
  }, [currentPage, searchTerm, viewMode, pageSize]);

  const handleCreateQuote = async (customerId?: number, initialJobName?: string) => {
    try {
      const created = await CreateManualQuote(
        new wailsTypes.CreateManualQuoteRequest({
        customerId: customerId || undefined,
        jobName: initialJobName || defaultForm.jobName,
        descriptionBody: stringifyQuoteMeta(
          defaultForm.notes,
          defaultForm.includeTotals,
          getDefaultPaymentSchedule(proposalDefaults.paymentsNote)
        ),
        lineItems: [],
        subtotal: defaultForm.subtotal,
        tax: defaultForm.tax,
        total: defaultForm.total,
        depositPercent: defaultForm.depositPercent,
        depositAmount: defaultForm.depositAmount,
        amountDue: defaultForm.amountDue,
        termsBlock1: proposalDefaults.termsBlock1,
        termsBlock2: proposalDefaults.termsBlock2,
        paymentsNote: proposalDefaults.paymentsNote,
        creditCardNote: proposalDefaults.creditCardNote,
        signatureNote: proposalDefaults.signatureNote,
      })
      );

      const quote = (created as ManualQuote) || null;
      setCurrentQuote(quote);
      if (quote) {
        const nextForm = quoteToForm(quote);
        if (!nextForm.paymentSchedule.trim()) {
          nextForm.paymentSchedule = getDefaultPaymentSchedule(proposalDefaults.paymentsNote);
        }
        setForm(nextForm);
        setIsCreatingProposal(true);
      }
      setViewMode('edit');
      const defaultRate = taxRates.find((r) => r.isDefault);
      if (defaultRate) {
        setSelectedTaxRateId(defaultRate.id.toString());
      } else {
        setSelectedTaxRateId('');
      }
      await fetchQuotesPage();
      showToast('Proposal created', 'success');
    } catch (error) {
      console.error('Failed to create manual quote:', error);
      showToast('Failed to create manual quote', 'error');
    }
  };

  const handleLoadQuote = async (id: number) => {
    try {
      const loaded = await GetManualQuote(id);
      const quote = (loaded as ManualQuote) || null;
      setCurrentQuote(quote);
      if (quote) {
        const nextForm = quoteToForm(quote);
        if (!nextForm.paymentSchedule.trim()) {
          nextForm.paymentSchedule = getDefaultPaymentSchedule(proposalDefaults.paymentsNote);
        }
        setForm(nextForm);

        // Try to find a matching tax rate
        const matchingRate = taxRates.find(
          (r) => Math.abs((quote.subtotal || 0) * (r.rate / 100) - (quote.tax || 0)) < 0.01
        );
        if (matchingRate) {
          setSelectedTaxRateId(matchingRate.id.toString());
        } else {
          setSelectedTaxRateId('');
        }
      }
      setIsCreatingProposal(false);
      setViewMode('edit');
    } catch (error) {
      console.error('Failed to load manual quote:', error);
      showToast('Failed to load manual quote', 'error');
    }
  };

  const handleSaveQuote = async (showSuccessToast = true) => {
    if (!currentQuote) return false;
    if (!form.jobName.trim()) {
      showToast('Job name is required', 'error');
      return false;
    }

    const payload = new wailsTypes.UpdateManualQuoteRequest({
      id: currentQuote.id,
      customerId: form.customerId || undefined,
      jobName: form.jobName.trim(),
      descriptionBody: stringifyQuoteMeta(form.notes, form.includeTotals, form.paymentSchedule),
      lineItems: form.lineItems.map((item, index) => ({
        itemName: item.itemName,
        description: item.description,
        lineTotal: item.lineTotal,
        sortOrder: index,
      })),
      subtotal: form.subtotal,
      tax: form.tax,
      total: form.total,
      depositPercent: form.depositPercent,
      depositAmount: form.depositAmount,
      amountDue: form.amountDue,
      termsBlock1: proposalDefaults.termsBlock1,
      termsBlock2: proposalDefaults.termsBlock2,
      paymentsNote: proposalDefaults.paymentsNote,
      creditCardNote: proposalDefaults.creditCardNote,
      signatureNote: proposalDefaults.signatureNote,
    });

    try {
      const updated = await UpdateManualQuote(payload);
      const quote = (updated as ManualQuote) || null;
      setCurrentQuote(quote);
      setIsCreatingProposal(false);
      if (quote) {
        setForm(quoteToForm(quote));
      }
      await fetchQuotesPage();
      if (showSuccessToast) {
        showToast('Proposal saved', 'success');
      }
      return true;
    } catch (error) {
      console.error('Failed to save manual quote:', error);
      showToast('Failed to save manual quote', 'error');
      return false;
    }
  };

  const handlePrintQuote = async () => {
    const saved = await handleSaveQuote(false);
    if (!saved) return;
    window.print();
  };

  const handleSaveProposalPDF = async () => {
    if (!currentQuote) return;

    const saved = await handleSaveQuote(false);
    if (!saved) return;

    try {
      const printHtml = buildPrintDocumentHtml();
      const filePath = await GenerateProposalPDF(currentQuote.id, printHtml);
      showToast('PDF saved successfully', 'success');
      await OpenFileInDefaultApp(filePath);
    } catch (error) {
      console.error('Failed to save proposal PDF:', error);
      showToast(`Failed to save PDF: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const handleQuickPrintQuote = async (id: number) => {
    await handleLoadQuote(id);

    setTimeout(() => {
      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        setCurrentQuote(null);
        setIsCreatingProposal(false);
        setForm(defaultForm);
        setDraftNote(defaultDraftNote);
        setViewMode('list');
      };

      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }, 60);
  };

  const handleAddLineItem = () => {
    if (!draftLineItem.itemName.trim() && !draftLineItem.description.trim()) {
      showToast('Enter an item name or description', 'error');
      return;
    }

    const lineTotal = parseFloat(draftLineItem.lineTotal) || 0;

    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          clientId: createClientId('item'),
          itemName: draftLineItem.itemName.trim(),
          description: draftLineItem.description.trim(),
          lineTotal,
          sortOrder: prev.lineItems.length,
        },
      ],
    }));
    setDraftLineItem(defaultDraftLineItem);
    setIsCustomCabinetSuggestionsOpen(false);
  };

  const applyCustomCabinetEstimateToDraft = (estimate: EstimateJob) => {
    setDraftLineItem((prev) => ({
      ...prev,
      itemName: 'Custom Cabinets',
      description: '',
      lineTotal: (estimate.totalAmount || 0).toFixed(2),
    }));
    setIsCustomCabinetSuggestionsOpen(false);
  };

  const updateLineItem = (index: number, key: 'itemName' | 'description' | 'lineTotal', value: string) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (key === 'lineTotal') {
          return { ...item, lineTotal: parseFloat(value) || 0 };
        }

        return { ...item, [key]: value };
      }),
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })),
    }));
  };

  const reorderLineItems = (items: EditableLineItem[]) => {
    setForm((prev) => ({
      ...prev,
      lineItems: items.map((item, index) => ({ ...item, sortOrder: index })),
    }));
  };

  const handleAddNote = () => {
    if (!draftNote.text.trim()) {
      showToast('Enter a note before adding', 'error');
      return;
    }

    setForm((prev) => ({
      ...prev,
      notes: [
        ...prev.notes,
        {
          clientId: createClientId('note'),
          text: draftNote.text.trim(),
          includeInitials: draftNote.includeInitials,
        },
      ],
    }));

    setDraftNote(defaultDraftNote);
  };

  const updateNote = (index: number, text: string) => {
    setForm((prev) => ({
      ...prev,
      notes: prev.notes.map((note, noteIndex) =>
        noteIndex === index ? { ...note, text } : note
      ),
    }));
  };

  const toggleNoteInitials = (index: number) => {
    setForm((prev) => ({
      ...prev,
      notes: prev.notes.map((note, noteIndex) =>
        noteIndex === index ? { ...note, includeInitials: !note.includeInitials } : note
      ),
    }));
  };

  const removeNote = (index: number) => {
    setForm((prev) => ({
      ...prev,
      notes: prev.notes.filter((_, noteIndex) => noteIndex !== index),
    }));
  };

  const reorderNotes = (notes: EditableQuoteNote[]) => {
    setForm((prev) => ({
      ...prev,
      notes,
    }));
  };

  const LineItemEditorRow = ({
    item,
    index,
    listeners,
    attributes,
  }: {
    item: EditableLineItem;
    index: number;
  } & SortableEditableRowProps) => (
    <div className="px-3 py-2 bg-zinc-900/40 rounded">
      <div className="grid grid-cols-[32px_1fr_44px] gap-2 items-start">
        <div className="pt-2 flex justify-center">
          <DragHandle listeners={listeners} attributes={attributes} />
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              value={item.itemName}
              onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              value={item.lineTotal || ''}
              onChange={(e) => updateLineItem(index, 'lineTotal', e.target.value)}
              className="text-right"
            />
          </div>
          <textarea
            rows={2}
            value={item.description}
            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
            placeholder="Description"
            className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
          />
        </div>
        <div className="pt-1 flex justify-center">
          <Button variant="ghost" onClick={() => removeLineItem(index)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );

  const NoteEditorRow = ({
    note,
    index,
    listeners,
    attributes,
  }: {
    note: EditableQuoteNote;
    index: number;
  } & SortableEditableRowProps) => (
    <div className="px-3 py-3 bg-zinc-900/40 rounded">
      <div className="grid grid-cols-[32px_1fr] gap-2 items-start">
        <div className="pt-1 flex justify-center">
          <DragHandle listeners={listeners} attributes={attributes} />
        </div>
        <div className="space-y-2">
          <textarea
            rows={2}
            value={note.text}
            onChange={(e) => updateNote(index, e.target.value)}
            className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
          />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={note.includeInitials}
                onChange={() => toggleNoteInitials(index)}
              />
              Include initials line
            </label>
            <Button variant="ghost" onClick={() => removeNote(index)}>
              <Trash2 size={14} className="text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const openDeleteModal = (quote: ManualQuote) => {
    setQuoteToDelete(quote);
    setIsDeleteModalOpen(true);
  };

  const handleCancelNewProposal = async () => {
    if (!currentQuote || !isCreatingProposal) return;

    try {
      await DeleteManualQuote(currentQuote.id);
      setCurrentQuote(null);
      setIsCreatingProposal(false);
      setForm(defaultForm);
      setDraftNote(defaultDraftNote);
      setViewMode('list');
      await fetchQuotesPage();
      showToast('Proposal cancelled', 'success');
    } catch (error) {
      console.error('Failed to cancel proposal:', error);
      showToast('Failed to cancel proposal', 'error');
    }
  };

  const preventNumberArrowAdjust = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
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
    void handleCreateQuote(quickCreateForCustomer.customerId, `New Proposal`);
    onQuickCreateHandled?.();
  }, [quickCreateForCustomer, loading, lastHandledQuickCreateToken, onQuickCreateHandled]);

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      await DeleteManualQuote(quoteToDelete.id);
      if (currentQuote?.id === quoteToDelete.id) {
        setCurrentQuote(null);
        setIsCreatingProposal(false);
        setForm(defaultForm);
        setDraftNote(defaultDraftNote);
        setViewMode('list');
      }
      await fetchQuotesPage();
      showToast('Proposal deleted', 'success');
    } catch (error) {
      console.error('Failed to delete manual quote:', error);
      showToast('Failed to delete manual quote', 'error');
    } finally {
      setQuoteToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading manual quotes...</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-100">Proposals</h2>
          <Button onClick={() => void handleCreateQuote()}>
            <Plus size={16} className="mr-2" />
            New Proposal
          </Button>
        </div>

        <Input
          placeholder="Search proposals by number, customer, job, or date"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {totalQuotes === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400">
                {searchTerm.trim()
                  ? 'No proposals match your search.'
                  : 'No proposals yet. Create one to start building proposal-style quotes.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Quote #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Job Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Total</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer"
                      onClick={() => handleLoadQuote(quote.id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                        {quote.quoteNumber || `P-${quote.id.toString().padStart(4, '0')}`}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">{quote.customer?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{quote.jobName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(quote.quoteDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100 text-right">
                        {formatCurrency(quote.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleQuickPrintQuote(quote.id);
                          }}
                        >
                          <Printer size={14} className="text-zinc-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(quote);
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
                  Showing {totalQuotes === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalQuotes)} of {totalQuotes}
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
            setQuoteToDelete(null);
            setIsDeleteModalOpen(false);
          }}
          title="Delete Proposal"
        >
          <div className="space-y-4">
            <p className="text-zinc-300">
              Are you sure you want to delete
              {quoteToDelete ? ` "${quoteToDelete.quoteNumber || quoteToDelete.jobName}"` : ' this quote'}?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setQuoteToDelete(null);
                  setIsDeleteModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteQuote}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <section className="print-only manual-quote-print">
        <div className="manual-quote-sheet max-w-[900px] mx-auto px-8 py-7 text-black bg-white">
          <div className="grid grid-cols-2 gap-8 mb-5">
            <div>
              <h1 className="text-[22px] font-semibold leading-none tracking-tight">
                {companySettings?.companyName || 'CabCon'}
              </h1>
              {companySettings?.addressLine1 && (
                <p className="text-[14px] mt-3 leading-tight">{companySettings.addressLine1}</p>
              )}
              {companySettings?.addressLine2 && (
                <p className="text-[14px] leading-tight">{companySettings.addressLine2}</p>
              )}
              {(companySettings?.phone || companySettings?.email) && (
                <p className="text-[14px] mt-3 leading-tight">
                  {companySettings?.phone || ''}
                  {companySettings?.phone && companySettings?.email ? ' | ' : ''}
                  {companySettings?.email || ''}
                </p>
              )}
            </div>

            <div className="text-right text-[14px] leading-tight pt-1">
              {selectedCustomer?.name && <p className="font-bold text-[16px]">{selectedCustomer.name}</p>}
              {selectedCustomer?.address && <p>{selectedCustomer.address}</p>}
              {selectedCustomer?.phone && <p>{selectedCustomer.phone}</p>}
              {selectedCustomer?.email && <p>{selectedCustomer.email}</p>}
            </div>
          </div>

          <div className="flex justify-end mb-2 text-[14px] leading-tight">
            <div className="w-[260px]">
              <p className="flex justify-between"><span className="font-semibold">Date</span><span>{quoteDateText}</span></p>
              <p className="flex justify-between mt-2"><span className="font-semibold">Job</span><span>{form.jobName}</span></p>
            </div>
          </div>

          <div className="border-b border-black pb-1 mb-2 flex justify-between text-[16px] font-semibold leading-none">
            <span>Description</span>
            <span>Total</span>
          </div>

          <div className="min-h-[390px] text-[13px] leading-[1.45]">
            {form.lineItems.length === 0 ? (
              <p className="text-zinc-500">No line items added</p>
            ) : (
              <div className="space-y-2">
                {form.lineItems.map((item, index) => (
                  <div key={`${item.itemName}-${index}`} className="grid grid-cols-[1fr_120px] gap-4">
                    <div>
                      <p className="font-medium">{item.itemName || 'Item'}</p>
                      {item.description && <p className="text-[12px] mt-0.5">{item.description}</p>}
                    </div>
                    <div className="text-right">{formatCurrency(item.lineTotal || 0)}</div>
                  </div>
                ))}
              </div>
            )}

            {form.notes.length > 0 && (
              <div className="mt-6 space-y-2 text-[12px] leading-[1.4] font-semibold">
                {form.notes.map((note, index) => (
                  <div key={`${note.text}-${index}`} className="flex items-end gap-3">
                    <p className="whitespace-pre-wrap flex-1">{note.text}</p>
                    {note.includeInitials && <span className="inline-block w-12 border-b border-black" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_420px] gap-8 mt-16 items-end">
            <div className="text-[10px] leading-[1.35] max-w-[280px]">
              <p>{proposalDefaults.termsBlock1}</p>
              <p className="mt-3">{proposalDefaults.termsBlock2}</p>
              {proposalDefaults.termsBlock3 && <p className="mt-3">{proposalDefaults.termsBlock3}</p>}
            </div>

            <div className="pt-2">
              <div className="flex items-end justify-between">
                <p className="text-[11px] font-semibold mb-1">Payments to be made as follows:</p>
                <div className="w-[240px] text-[14px] leading-tight">
                  <div className="flex justify-between py-1.5">
                    <span className="font-semibold">Subtotal</span>
                    <span>{form.includeTotals ? formatCurrency(form.subtotal) : ''}</span>
                  </div>
                  <div className="flex justify-between border-t border-black py-1.5">
                    <span className="font-semibold">Tax</span>
                    <span>{form.includeTotals ? formatCurrency(form.tax) : ''}</span>
                  </div>
                  <div className="flex justify-between border-t border-black py-1.5 font-semibold">
                    <span>Total</span>
                    <span>{form.includeTotals ? formatCurrency(form.total) : ''}</span>
                  </div>
                </div>
              </div>

              <div className="w-full text-[14px] leading-tight">
                <div className="manual-quote-payment-schedule px-2 py-1 min-h-[1.5em]">
                  <p className="text-[13px] leading-tight font-medium">{form.paymentSchedule}</p>
                </div>
                <div className="flex justify-between py-1.5 mt-2 font-semibold">
                  <span>Deposit</span>
                  <span>{form.includeTotals ? formatCurrency(form.depositAmount) : ''}</span>
                </div>
                <div className="flex justify-between border-t border-black py-1.5 font-semibold">
                  <span>Amount Due</span>
                  <span>{form.includeTotals ? formatCurrency(form.amountDue) : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="manual-quote-credit-card-note mt-2 text-center text-[11px] font-semibold py-[5px] px-2 border-y border-black/25">
            {proposalDefaults.creditCardNote}
          </div>

          <p className="text-center text-[11px] mt-1 font-medium">{proposalDefaults.signatureNote}</p>

          <div className="mt-10 grid grid-cols-[1fr_340px] gap-8 items-end text-[12px] leading-none">
            <div className="border-b border-black pb-1">Customer's Signature</div>
            <div className="border-b border-black pb-1 text-left">Date</div>
          </div>
        </div>
      </section>

      <div className="space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentQuote(null);
                setIsCreatingProposal(false);
                setForm(defaultForm);
                setDraftNote(defaultDraftNote);
                setViewMode('list');
              }}
            >
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">{selectedCustomer?.name || 'No customer selected'}</h2>
              <p className="text-sm text-zinc-400">{form.jobName || 'Proposal'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isCreatingProposal && (
              <Button variant="ghost" onClick={() => void handleCancelNewProposal()}>
                Cancel
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => void handleSaveQuote()}
            >
              <Save size={16} className="mr-2" />
              Save Quote
            </Button>
            <Button variant="secondary" onClick={() => void handleSaveProposalPDF()}>
              <FileText size={16} className="mr-2" />
              Save PDF
            </Button>
            <Button onClick={handlePrintQuote}>
              <Printer size={16} className="mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="space-y-4 w-full">
        <div className="space-y-4 w-full">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-zinc-100">Quote Details</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CustomerCombobox
                  label="Customer"
                  customers={activeCustomers}
                  value={form.customerId}
                  onChange={(customerId) =>
                    setForm((prev) => ({
                      ...prev,
                      customerId,
                    }))
                  }
                  placeholder="Search customer..."
                />
                <Input
                  label="Job Name"
                  value={form.jobName}
                  onChange={(e) => setForm((prev) => ({ ...prev, jobName: e.target.value }))}
                  placeholder="e.g., Kitchen + Laundry Cabinet Package"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/60">
                  <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Customer Preview</p>
                  <p className="text-sm text-zinc-100">{selectedCustomer?.name || '-'}</p>
                  <p className="text-sm text-zinc-400">{selectedCustomer?.address || ''}</p>
                  <p className="text-sm text-zinc-400">{selectedCustomer?.phone || ''}</p>
                  <p className="text-sm text-zinc-400">{selectedCustomer?.email || ''}</p>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/60">
                  <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Quote Info</p>
                  <p className="text-sm text-zinc-100">Quote #: {currentQuote?.quoteNumber || '-'}</p>
                  <p className="text-sm text-zinc-400">
                    Date: {currentQuote?.quoteDate ? formatDate(currentQuote.quoteDate) : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">Line Items</label>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_140px_110px] gap-2">
                    <div className="relative">
                      <Input
                        placeholder="Item"
                        value={draftLineItem.itemName}
                        onFocus={() => setIsCustomCabinetSuggestionsOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsCustomCabinetSuggestionsOpen(false), 120);
                        }}
                        onChange={(e) =>
                          setDraftLineItem((prev) => ({ ...prev, itemName: e.target.value }))
                        }
                      />
                      {isCustomCabinetSuggestionsOpen && filteredCustomCabinetSuggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
                          {filteredCustomCabinetSuggestions.map((estimate) => (
                            <button
                              key={estimate.jobId}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyCustomCabinetEstimateToDraft(estimate);
                              }}
                            >
                              <p className="font-medium">{estimate.jobName}</p>
                              <p className="text-xs text-zinc-400">Custom Cabinets - {formatCurrency(estimate.totalAmount || 0)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="Total"
                      type="number"
                      step="0.01"
                      value={draftLineItem.lineTotal}
                      onChange={(e) =>
                        setDraftLineItem((prev) => ({ ...prev, lineTotal: e.target.value }))
                      }
                    />
                    <Button onClick={handleAddLineItem}>Add Item</Button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Description"
                    value={draftLineItem.description}
                    onChange={(e) =>
                      setDraftLineItem((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                </div>

                <div className="rounded-lg border border-zinc-700 overflow-hidden">
                  <div className="grid grid-cols-[28px_1fr_120px_70px] gap-2 px-3 py-2 bg-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                    <span></span>
                    <span>Item</span>
                    <span className="text-right">Total</span>
                    <span></span>
                  </div>

                  {form.lineItems.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-zinc-500">No line items yet</div>
                  ) : (
                    <SortableList
                      items={form.lineItems}
                      onReorder={reorderLineItems}
                      keyExtractor={(item) => item.clientId}
                      className="space-y-2 p-2"
                      renderItem={(item) => {
                        const index = form.lineItems.findIndex((entry) => entry.clientId === item.clientId);
                        return <LineItemEditorRow item={item} index={index} />;
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-zinc-100">Notes</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={draftNote.text}
                    onChange={(e) => setDraftNote((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={draftNote.includeInitials}
                        onChange={(e) =>
                          setDraftNote((prev) => ({ ...prev, includeInitials: e.target.checked }))
                        }
                      />
                      Include initials line
                    </label>
                    <Button onClick={handleAddNote}>Add Note</Button>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 overflow-hidden">
                  {form.notes.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-zinc-500">No notes yet</div>
                  ) : (
                    <SortableList
                      items={form.notes}
                      onReorder={reorderNotes}
                      keyExtractor={(note) => note.clientId}
                      className="space-y-2 p-2"
                      renderItem={(note) => {
                        const index = form.notes.findIndex((entry) => entry.clientId === note.clientId);
                        return <NoteEditorRow note={note} index={index} />;
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-zinc-100">Totals</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.includeTotals}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, includeTotals: e.target.checked }))
                    }
                  />
                  Include totals on print
                </label>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Line Items Subtotal</span>
                  <span className="text-zinc-100">{formatCurrency(lineItemsSubtotal)}</span>
                </div>
                <Input
                  label="Subtotal"
                  type="number"
                  step="0.01"
                  value={form.subtotal === 0 ? '' : form.subtotal.toFixed(2)}
                  onKeyDown={preventNumberArrowAdjust}
                  readOnly
                />
                <Select
                  label="Tax Rate"
                  value={selectedTaxRateId}
                  onChange={(value) => setSelectedTaxRateId(value)}
                  options={taxRates.map((rate) => ({
                    value: rate.id,
                    label: `${rate.name} (${rate.rate.toFixed(2)}%)`,
                  }))}
                  placeholder="Select tax rate..."
                />
                <Input
                  label="Tax"
                  type="number"
                  step="0.01"
                  value={form.tax === 0 ? '' : form.tax.toFixed(2)}
                  onKeyDown={preventNumberArrowAdjust}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Total"
                  type="number"
                  step="0.01"
                  value={form.total === 0 ? '' : form.total.toFixed(2)}
                  onKeyDown={preventNumberArrowAdjust}
                  readOnly
                />
                <Input
                  label="Payment Schedule"
                  value={form.paymentSchedule}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentSchedule: e.target.value }))}
                  placeholder="e.g., 75% Deposit"
                />
                <Input
                  label="Deposit %"
                  type="number"
                  step="1"
                  value={form.depositPercent === 0 ? '' : form.depositPercent.toFixed(0)}
                  onKeyDown={preventNumberArrowAdjust}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, depositPercent: Math.round(parseFloat(e.target.value)) || 0 }))
                  }
                />
                <Input
                  label="Deposit Amount"
                  type="number"
                  step="0.01"
                  value={form.depositAmount === 0 ? '' : form.depositAmount.toFixed(2)}
                  onKeyDown={preventNumberArrowAdjust}
                  readOnly
                />
                <Input
                  label="Amount Due"
                  type="number"
                  step="0.01"
                  value={form.amountDue === 0 ? '' : form.amountDue.toFixed(2)}
                  onKeyDown={preventNumberArrowAdjust}
                  readOnly
                />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
