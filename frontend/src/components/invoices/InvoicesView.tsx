import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  Plus,
  ChevronLeft,
  Trash2,
  Save,
  Printer,
  FileText,
  Copy,
  Archive,
  ArchiveRestore,
  MoreVertical,
} from "lucide-react";
import { SortableList } from "../dnd/SortableList";
import { DragHandle } from "../dnd/DragHandle";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { StatusBadge } from "../ui/StatusBadge";
import { CustomerCombobox } from "../ui/CustomerCombobox";
import { CustomerForm } from "../customers/CustomerForm";
import { Modal } from "../ui/Modal";
import { RowActionMenu } from "../ui/RowActionMenu";
import { useToast } from "../ui/Toast";
import { formatCurrency, formatDate } from "../../lib/utils";
import { buildPrintDocumentHtml } from "../../lib/printHtml";
import { printHtmlInHiddenFrame } from "../../lib/framePrint";
import type {
  CompanySettings,
  Customer,
  CreateCustomerRequest,
  Invoice,
  InvoiceLineItemRequest,
  InvoicePaymentRequest,
  TaxRate,
} from "../../types";
import { types as wailsTypes } from "../../../wailsjs/go/models";
import {
  GetAllCustomers,
  CreateCustomer,
  GetInvoicesPage,
  GetInvoice,
  GetCompanySettings,
  CreateInvoice,
  UpdateInvoice,
  DeleteInvoice,
  DuplicateInvoice,
  UpdateInvoiceArchived,
  UpdateInvoiceStatus,
  GetAllTaxRates,
  GenerateInvoicePDF,
  OpenFileInDefaultApp,
} from "../../../wailsjs/go/main/App";

type ViewMode = "list" | "edit";

interface InvoicesViewProps {
  openInvoiceRecord?: {
    id: number;
    token: number;
  } | null;
  onOpenInvoiceHandled?: () => void;
  statusRequest?: {
    status: string;
    token: number;
  } | null;
  onStatusRequestHandled?: () => void;
}

interface InvoiceFormState {
  customerId: number;
  jobName: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
  lineItems: EditableLineItem[];
  payments: EditablePayment[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

interface EditableLineItem extends InvoiceLineItemRequest {
  clientId: string;
}

interface EditablePayment extends InvoicePaymentRequest {
  clientId: string;
}

interface SortableEditableRowProps {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
  showDragHandle?: boolean;
}

interface LineItemEditorRowProps extends SortableEditableRowProps {
  item: EditableLineItem;
  index: number;
  onUpdateLineItem: (
    index: number,
    key: "itemName" | "description" | "lineTotal",
    value: string,
  ) => void;
  onRemoveLineItem: (index: number) => void;
  onPreventNumberArrowAdjust: (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
}

interface DraftLineItemState {
  itemName: string;
  description: string;
  lineTotal: string;
}

interface DraftPaymentState {
  amount: string;
  paymentDate: string;
  method: string;
  cardType: string;
  cardLast4: string;
  checkNumber: string;
}

const invoiceStatuses = [
  "draft",
  "unpaid",
  "partial",
  "paid",
  "void",
] as const;

const paymentMethodOptions: { value: string; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
];

const cardTypeOptions: { value: string; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
  { value: "other", label: "Other" },
];

function paymentMethodLabel(method: string): string {
  const found = paymentMethodOptions.find((option) => option.value === method);
  return found?.label || method || "Cash";
}

function cardTypeLabel(cardType: string): string {
  const found = cardTypeOptions.find((option) => option.value === cardType);
  return found?.label || cardType || "";
}

function paymentDetailText(payment: {
  method: string;
  cardType: string;
  cardLast4: string;
  checkNumber: string;
}): string {
  if (payment.method === "credit_card") {
    const base = cardTypeLabel(payment.cardType);
    const last4 = (payment.cardLast4 || "").trim();
    return last4 ? `${base} •• ${last4}` : base;
  }
  if (payment.method === "check") {
    return payment.checkNumber ? `Check #${payment.checkNumber}` : "";
  }
  return "";
}

function deriveStatusForDisplay(
  manualStatus: string,
  amountPaid: number,
  balanceDue: number,
): string {
  const status = (manualStatus || "unpaid").toLowerCase();
  if (status === "draft" || status === "void") {
    return status;
  }
  if (balanceDue <= 0.005) {
    return "paid";
  }
  if (amountPaid > 0) {
    return "partial";
  }
  return "unpaid";
}

function sanitizeCardLast4(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

function isInvoiceOverdue(invoice: Invoice): boolean {
  if (!(invoice.balanceDue > 0.005)) {
    return false;
  }
  if (["paid", "void", "draft"].includes((invoice.status || "").toLowerCase())) {
    return false;
  }
  if (!invoice.dueDate) {
    return false;
  }
  return new Date(invoice.dueDate).getTime() < Date.now();
}

function dateToInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayInputValue(): string {
  return dateToInputValue(new Date());
}

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : dateToInputValue(date);
}

function dateInputToISO(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return isNaN(date.getTime()) ? "" : date.toISOString();
}

function addDaysInputValue(value: string, days: number): string {
  if (!value) return value;
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return dateToInputValue(date);
}

const defaultForm: InvoiceFormState = {
  customerId: 0,
  jobName: "",
  status: "unpaid",
  invoiceDate: todayInputValue(),
  dueDate: "",
  notes: "",
  lineItems: [],
  payments: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  amountPaid: 0,
  balanceDue: 0,
};

const defaultDraftLineItem: DraftLineItemState = {
  itemName: "",
  description: "",
  lineTotal: "",
};

const defaultDraftPayment: DraftPaymentState = {
  amount: "",
  paymentDate: todayInputValue(),
  method: "credit_card",
  cardType: "visa",
  cardLast4: "",
  checkNumber: "",
};

function createClientId(prefix: "item" | "payment"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function LineItemEditorRow({
  item,
  index,
  onUpdateLineItem,
  onRemoveLineItem,
  onPreventNumberArrowAdjust,
  listeners,
  attributes,
  showDragHandle = false,
}: LineItemEditorRowProps) {
  return (
    <div className="px-3 py-2 bg-zinc-900/40 rounded">
      <div className="grid grid-cols-[32px_1fr_44px] gap-2 items-start">
        <div className="pt-2 flex justify-center">
          {showDragHandle ? (
            <DragHandle listeners={listeners} attributes={attributes} />
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              value={item.itemName}
              onChange={(e) =>
                onUpdateLineItem(index, "itemName", e.target.value)
              }
            />
            <Input
              type="number"
              step="0.01"
              value={item.lineTotal || ""}
              onKeyDown={onPreventNumberArrowAdjust}
              onChange={(e) =>
                onUpdateLineItem(index, "lineTotal", e.target.value)
              }
              className="text-right"
            />
          </div>
          <textarea
            rows={2}
            value={item.description}
            onChange={(e) =>
              onUpdateLineItem(index, "description", e.target.value)
            }
            placeholder="Description"
            className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
          />
        </div>
        <div className="pt-2 flex justify-center">
          <Button variant="ghost" onClick={() => onRemoveLineItem(index)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function invoiceToForm(invoice: Invoice): InvoiceFormState {
  const storedPayments = (invoice.payments || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
    )
    .map((payment) => ({
      clientId: createClientId("payment"),
      amount: payment.amount || 0,
      paymentDate: toDateInputValue(payment.paymentDate),
      method: payment.method || "cash",
      cardType: payment.cardType || "",
      cardLast4: payment.cardLast4 || "",
      checkNumber: payment.checkNumber || "",
    }));

  let payments = storedPayments;
  if (payments.length === 0 && (invoice.amountPaid || 0) > 0) {
    payments = [
      {
        clientId: createClientId("payment"),
        amount: invoice.amountPaid || 0,
        paymentDate:
          toDateInputValue(invoice.invoiceDate) || todayInputValue(),
        method: "cash",
        cardType: "",
        cardLast4: "",
        checkNumber: "",
      },
    ];
  }

  return {
    customerId: invoice.customerId || 0,
    jobName: invoice.jobName || "",
    status: invoice.status || "unpaid",
    invoiceDate: toDateInputValue(invoice.invoiceDate) || todayInputValue(),
    dueDate: toDateInputValue(invoice.dueDate),
    notes: invoice.notes || "",
    lineItems: (invoice.lineItems || [])
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => ({
        clientId: createClientId("item"),
        itemName: item.itemName || "",
        description: item.description || "",
        lineTotal: item.lineTotal || 0,
        sortOrder: item.sortOrder || 0,
      })),
    payments,
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    total: invoice.total || 0,
    amountPaid: invoice.amountPaid || 0,
    balanceDue: invoice.balanceDue || 0,
  };
}

export function InvoicesView({
  openInvoiceRecord,
  onOpenInvoiceHandled,
  statusRequest,
  onStatusRequestHandled,
}: InvoicesViewProps) {
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>("");
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(defaultForm);
  const [draftLineItem, setDraftLineItem] =
    useState<DraftLineItemState>(defaultDraftLineItem);
  const [draftPayment, setDraftPayment] =
    useState<DraftPaymentState>(defaultDraftPayment);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceActionMenu, setInvoiceActionMenu] = useState<{
    invoiceId: number;
    top: number;
    left: number;
  } | null>(null);
  const [lastHandledOpenToken, setLastHandledOpenToken] = useState<
    number | null
  >(null);
  const [lastHandledStatusToken, setLastHandledStatusToken] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<InvoiceFormState>(defaultForm);
  const currentInvoiceRef = useRef<Invoice | null>(null);
  const savedFormJsonRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);
  const skipNextAutosaveRef = useRef(false);
  const persistInvoiceRef = useRef<
    (formState: InvoiceFormState) => Promise<boolean>
  >(() => Promise.resolve(false));

  const clearAutosaveTimer = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const buildInvoicePayload = (formState: InvoiceFormState) => {
    const invoice = currentInvoiceRef.current;
    if (!invoice) return null;

    const invoiceDateIso =
      dateInputToISO(formState.invoiceDate) ||
      dateInputToISO(todayInputValue());
    const dueDateIso = dateInputToISO(formState.dueDate) || invoiceDateIso;

    return new wailsTypes.UpdateInvoiceRequest({
      id: invoice.id,
      customerId: formState.customerId || undefined,
      jobName: formState.jobName.trim(),
      status: formState.status,
      invoiceDate: invoiceDateIso,
      dueDate: dueDateIso,
      notes: formState.notes,
      lineItems: formState.lineItems.map((item, index) => ({
        itemName: item.itemName,
        description: item.description,
        lineTotal: item.lineTotal,
        sortOrder: index,
      })),
      payments: formState.payments.map((payment) => ({
        amount: payment.amount,
        paymentDate:
          dateInputToISO(payment.paymentDate) ||
          dateInputToISO(todayInputValue()),
        method: payment.method,
        cardType: payment.cardType,
        cardLast4: payment.cardLast4,
        checkNumber: payment.checkNumber,
      })),
      subtotal: formState.subtotal,
      tax: formState.tax,
      total: formState.total,
      amountPaid: formState.amountPaid,
      balanceDue: formState.balanceDue,
    });
  };

  const persistInvoice = async (
    formState: InvoiceFormState,
  ): Promise<boolean> => {
    const invoice = currentInvoiceRef.current;
    if (!invoice) return false;

    const payload = buildInvoicePayload(formState);
    if (!payload) return false;

    try {
      const updated = (await UpdateInvoice(payload)) as Invoice | null;
      if (updated) {
        currentInvoiceRef.current = updated;
        setCurrentInvoice(updated);
        savedFormJsonRef.current = JSON.stringify(formState);
      }
      return true;
    } catch (error) {
      console.error("Failed to autosave invoice:", error);
      return false;
    }
  };
  persistInvoiceRef.current = persistInvoice;

  const flushAutosave = async () => {
    clearAutosaveTimer();
    if (!hasHydratedRef.current) return;
    if (!currentInvoiceRef.current) return;
    const json = JSON.stringify(formRef.current);
    if (savedFormJsonRef.current === json) return;
    await persistInvoiceRef.current(formRef.current);
  };

  const scheduleAutosave = () => {
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      void flushAutosave();
    }, 1000);
  };

  useEffect(() => {
    formRef.current = form;
    currentInvoiceRef.current = currentInvoice;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      savedFormJsonRef.current = JSON.stringify(form);
      return;
    }
    if (!hasHydratedRef.current || !currentInvoice) return;
    if (savedFormJsonRef.current === JSON.stringify(form)) return;
    scheduleAutosave();
    return () => clearAutosaveTimer();
  }, [form, currentInvoice]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (hasHydratedRef.current && currentInvoiceRef.current) {
        const json = JSON.stringify(formRef.current);
        if (savedFormJsonRef.current !== json) {
          void persistInvoiceRef.current(formRef.current);
        }
      }
    };
  }, []);

  const lineItemsSubtotal = useMemo(
    () => form.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0),
    [form.lineItems],
  );
  const autoTotal = useMemo(
    () => Number((form.subtotal + form.tax).toFixed(2)),
    [form.subtotal, form.tax],
  );
  const paymentsTotal = useMemo(
    () =>
      Number(
        form.payments
          .reduce((sum, payment) => sum + (payment.amount || 0), 0)
          .toFixed(2),
      ),
    [form.payments],
  );
  const autoBalanceDue = useMemo(
    () => Number(Math.max(form.total - form.amountPaid, 0).toFixed(2)),
    [form.total, form.amountPaid],
  );
  const totalPages = Math.max(1, Math.ceil(totalInvoices / pageSize));

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId) || null,
    [customers, form.customerId],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, showArchived, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setForm((prev) =>
      prev.subtotal === lineItemsSubtotal
        ? prev
        : { ...prev, subtotal: lineItemsSubtotal },
    );
  }, [lineItemsSubtotal]);

  useEffect(() => {
    if (selectedTaxRateId) {
      const rate = taxRates.find((r) => r.id.toString() === selectedTaxRateId);
      if (rate) {
        const calculatedTax = Number(
          (form.subtotal * (rate.rate / 100)).toFixed(2),
        );
        setForm((prev) => ({ ...prev, tax: calculatedTax }));
      }
    }
  }, [selectedTaxRateId, form.subtotal, taxRates]);

  useEffect(() => {
    setForm((prev) =>
      prev.total === autoTotal ? prev : { ...prev, total: autoTotal },
    );
  }, [autoTotal]);

  useEffect(() => {
    setForm((prev) =>
      prev.amountPaid === paymentsTotal
        ? prev
        : { ...prev, amountPaid: paymentsTotal },
    );
  }, [paymentsTotal]);

  useEffect(() => {
    setForm((prev) =>
      prev.balanceDue === autoBalanceDue
        ? prev
        : { ...prev, balanceDue: autoBalanceDue },
    );
  }, [autoBalanceDue]);

  const fetchInvoicesPage = async (
    page = currentPage,
    search = searchTerm,
    size = pageSize,
    status = statusFilter,
    archived = showArchived,
  ) => {
    try {
      const response = await GetInvoicesPage({
        page,
        pageSize: size,
        search,
        status,
        showArchived: archived,
      });
      setInvoices((response?.items || []) as Invoice[]);
      setTotalInvoices(response?.total || 0);
    } catch (error) {
      console.error("Failed to fetch invoice list:", error);
      showToast("Failed to fetch invoice list", "error");
    }
  };

  const fetchStaticData = async () => {
    try {
      const [customersData, companySettingsData, taxRatesData] =
        await Promise.all([
          GetAllCustomers(),
          GetCompanySettings(),
          GetAllTaxRates(),
        ]);
      setCustomers((customersData || []) as Customer[]);
      setCompanySettings(
        (companySettingsData || null) as CompanySettings | null,
      );
      setTaxRates((taxRatesData || []) as TaxRate[]);
    } catch (error) {
      console.error("Failed to fetch invoice data:", error);
      showToast("Failed to fetch invoice data", "error");
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchStaticData();
      await fetchInvoicesPage();
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (loading || viewMode !== "list") {
      return;
    }
    void fetchInvoicesPage();
  }, [currentPage, searchTerm, statusFilter, showArchived, viewMode, pageSize]);

  const handleCreateInvoice = async () => {
    try {
      const today = todayInputValue();
      const created = await CreateInvoice(
        new wailsTypes.CreateInvoiceRequest({
          customerId: undefined,
          jobName: "",
          status: defaultForm.status,
          invoiceDate: dateInputToISO(today),
          dueDate: dateInputToISO(addDaysInputValue(today, 14)),
          notes: "",
          lineItems: [],
          payments: [],
          subtotal: defaultForm.subtotal,
          tax: defaultForm.tax,
          total: defaultForm.total,
          amountPaid: defaultForm.amountPaid,
          balanceDue: defaultForm.balanceDue,
        }),
      );

      const invoice = (created as Invoice) || null;
      setCurrentInvoice(invoice);
      if (invoice) {
        const nextForm = invoiceToForm(invoice);
        setForm(nextForm);
        setIsCreatingInvoice(true);
        hasHydratedRef.current = true;
        skipNextAutosaveRef.current = true;
      }
      setViewMode("edit");
      const defaultRate = taxRates.find((r) => r.isDefault);
      if (defaultRate) {
        setSelectedTaxRateId(defaultRate.id.toString());
      } else {
        setSelectedTaxRateId("");
      }
      await fetchInvoicesPage();
      showToast("Invoice created", "success");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      showToast("Failed to create invoice", "error");
    }
  };

  const handleCreateCustomer = async (data: CreateCustomerRequest) => {
    try {
      const created = (await CreateCustomer({
        ...data,
        archived: false,
      })) as Customer | null;
      if (created) {
        setCustomers((prev) => [...prev, created]);
        setForm((prev) => ({ ...prev, customerId: created.id }));
        setIsAddCustomerModalOpen(false);
        showToast("Customer added", "success");
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      showToast("Failed to create customer", "error");
    }
  };

  const handleLoadInvoice = async (id: number) => {
    try {
      const loaded = await GetInvoice(id);
      const invoice = (loaded as Invoice) || null;
      setCurrentInvoice(invoice);
      if (invoice) {
        const nextForm = invoiceToForm(invoice);
        setForm(nextForm);
        hasHydratedRef.current = true;
        skipNextAutosaveRef.current = true;

        const matchingRate = taxRates.find(
          (r) =>
            Math.abs(
              (invoice.subtotal || 0) * (r.rate / 100) - (invoice.tax || 0),
            ) < 0.01,
        );
        if (matchingRate) {
          setSelectedTaxRateId(matchingRate.id.toString());
        } else {
          setSelectedTaxRateId("");
        }
      }
      setIsCreatingInvoice(false);
      setViewMode("edit");
    } catch (error) {
      console.error("Failed to load invoice:", error);
      showToast("Failed to load invoice", "error");
    }
  };

  const handleSaveInvoice = async (showSuccessToast = true) => {
    if (!currentInvoice) return false;
    if (!form.jobName.trim()) {
      showToast("Job name is required", "error");
      return false;
    }

    clearAutosaveTimer();
    const ok = await persistInvoice(form);
    if (!ok) {
      showToast("Failed to save invoice", "error");
      return false;
    }

    setIsCreatingInvoice(false);
    const nextForm = invoiceToForm(currentInvoiceRef.current!);
    setForm(nextForm);
    savedFormJsonRef.current = JSON.stringify(nextForm);
    await fetchInvoicesPage();
    if (showSuccessToast) {
      showToast("Invoice saved", "success");
    }
    return true;
  };

  const handlePrintInvoice = async () => {
    const saved = await handleSaveInvoice(false);
    if (!saved) return;

    try {
      const printHtml = buildPrintDocumentHtml();
      await printHtmlInHiddenFrame(printHtml);
    } catch (error) {
      console.error("Failed to print invoice:", error);
      showToast("Failed to open print dialog", "error");
    }
  };

  const handleSaveInvoicePDF = async () => {
    if (!currentInvoice) return;

    const saved = await handleSaveInvoice(false);
    if (!saved) return;

    let filePath = "";
    try {
      const printHtml = buildPrintDocumentHtml();
      filePath = await GenerateInvoicePDF(currentInvoice.id, printHtml);
      showToast("PDF saved successfully", "success");
    } catch (error) {
      console.error("Failed to save invoice PDF:", error);
      showToast(
        `Failed to save PDF: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      return;
    }

    if (companySettings?.openPdfAfterSave ?? true) {
      try {
        await OpenFileInDefaultApp(filePath);
      } catch (error) {
        console.error("PDF saved but failed to open invoice PDF:", error);
        showToast("PDF saved, but could not open automatically. Open it from the folder.", "error");
      }
    }
  };

  const handleQuickPrintInvoice = async (id: number) => {
    await handleLoadInvoice(id);

    setTimeout(async () => {
      try {
        const printHtml = buildPrintDocumentHtml();
        await printHtmlInHiddenFrame(printHtml);
      } catch (error) {
        console.error("Failed to quick print invoice:", error);
        showToast("Failed to open print dialog", "error");
      }

      setCurrentInvoice(null);
      setIsCreatingInvoice(false);
      setForm(defaultForm);
      setDraftLineItem(defaultDraftLineItem);
        setDraftPayment(defaultDraftPayment);
      setViewMode("list");
    }, 60);
  };

  const handleAddLineItem = () => {
    if (!draftLineItem.itemName.trim() && !draftLineItem.description.trim()) {
      showToast("Enter an item name or description", "error");
      return;
    }

    const lineTotal = parseFloat(draftLineItem.lineTotal) || 0;

    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          clientId: createClientId("item"),
          itemName: draftLineItem.itemName.trim(),
          description: draftLineItem.description.trim(),
          lineTotal,
          sortOrder: prev.lineItems.length,
        },
      ],
    }));
    setDraftLineItem(defaultDraftLineItem);
        setDraftPayment(defaultDraftPayment);
  };

  const updateLineItem = (
    index: number,
    key: "itemName" | "description" | "lineTotal",
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (key === "lineTotal") {
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

  const handleAddPayment = () => {
    const amount = parseFloat(draftPayment.amount) || 0;
    if (amount <= 0) {
      showToast("Enter a payment amount", "error");
      return;
    }
    if (!draftPayment.paymentDate) {
      showToast("Enter a payment date", "error");
      return;
    }

    setForm((prev) => ({
      ...prev,
      payments: [
        ...prev.payments,
        {
          clientId: createClientId("payment"),
          amount,
          paymentDate: draftPayment.paymentDate,
          method: draftPayment.method,
          cardType:
            draftPayment.method === "credit_card"
              ? draftPayment.cardType
              : "",
          cardLast4:
            draftPayment.method === "credit_card"
              ? sanitizeCardLast4(draftPayment.cardLast4)
              : "",
          checkNumber:
            draftPayment.method === "check"
              ? draftPayment.checkNumber.trim()
              : "",
        },
      ],
    }));
    setDraftPayment(defaultDraftPayment);
  };

  const removePayment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      payments: prev.payments.filter(
        (_, paymentIndex) => paymentIndex !== index,
      ),
    }));
  };

  const reorderLineItems = (items: EditableLineItem[]) => {
    setForm((prev) => ({
      ...prev,
      lineItems: items.map((item, itemIndex) => ({
        ...item,
        sortOrder: itemIndex,
      })),
    }));
  };

  const openDeleteModal = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteModalOpen(true);
  };

  const handleCancelNewInvoice = async () => {
    if (!currentInvoice || !isCreatingInvoice) return;

    clearAutosaveTimer();
    try {
      await DeleteInvoice(currentInvoice.id);
      setCurrentInvoice(null);
      setIsCreatingInvoice(false);
      setForm(defaultForm);
      setDraftLineItem(defaultDraftLineItem);
        setDraftPayment(defaultDraftPayment);
      setViewMode("list");
      await fetchInvoicesPage();
      showToast("Invoice cancelled", "success");
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
      showToast("Failed to cancel invoice", "error");
    }
  };

  const preventNumberArrowAdjust = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (!openInvoiceRecord || loading) {
      return;
    }

    if (openInvoiceRecord.token === lastHandledOpenToken) {
      return;
    }

    setLastHandledOpenToken(openInvoiceRecord.token);
    void handleLoadInvoice(openInvoiceRecord.id);
    onOpenInvoiceHandled?.();
  }, [
    openInvoiceRecord,
    loading,
    lastHandledOpenToken,
    onOpenInvoiceHandled,
  ]);

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await DeleteInvoice(invoiceToDelete.id);
      if (currentInvoice?.id === invoiceToDelete.id) {
        setCurrentInvoice(null);
        setIsCreatingInvoice(false);
        setForm(defaultForm);
        setDraftLineItem(defaultDraftLineItem);
        setDraftPayment(defaultDraftPayment);
        setViewMode("list");
      }
      await fetchInvoicesPage();
      showToast("Invoice deleted", "success");
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      showToast("Failed to delete invoice", "error");
    } finally {
      setInvoiceToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDuplicateInvoice = async (invoiceId: number) => {
    try {
      const duplicated = await DuplicateInvoice(invoiceId);
      const nextInvoice = (duplicated as Invoice) || null;
      if (nextInvoice?.id) {
        await fetchInvoicesPage();
        await handleLoadInvoice(nextInvoice.id);
        showToast("Invoice duplicated", "success");
      }
    } catch (error) {
      console.error("Failed to duplicate invoice:", error);
      showToast("Failed to duplicate invoice", "error");
    }
  };

  const handleArchiveToggle = async (invoice: Invoice, archive: boolean) => {
    try {
      await UpdateInvoiceArchived(invoice.id, archive);
      setInvoiceActionMenu(null);
      await fetchInvoicesPage();
      showToast(archive ? "Invoice archived" : "Invoice restored", "success");
    } catch (error) {
      console.error("Failed to update archive status:", error);
      showToast("Failed to update archive status", "error");
    }
  };

  const handleManualStatusToggle = async (
    invoice: Invoice,
    manual: "draft" | "void",
  ) => {
    const next = invoice.status === manual ? "unpaid" : manual;
    setInvoices((prev) =>
      prev.map((entry) =>
        entry.id === invoice.id ? { ...entry, status: next } : entry,
      ),
    );
    try {
      await UpdateInvoiceStatus(invoice.id, next);
      await fetchInvoicesPage();
      showToast("Invoice status updated", "success");
    } catch (error) {
      console.error("Failed to update invoice status:", error);
      showToast("Failed to update invoice status", "error");
      await fetchInvoicesPage();
    }
  };

  const toggleFormStatus = (manual: "draft" | "void") => {
    setForm((prev) => ({
      ...prev,
      status: prev.status === manual ? "unpaid" : manual,
    }));
  };

  const effectiveStatus = deriveStatusForDisplay(
    form.status,
    form.amountPaid,
    form.balanceDue,
  );

  useEffect(() => {
    if (!statusRequest || loading) {
      return;
    }

    if (statusRequest.token === lastHandledStatusToken) {
      return;
    }

    setLastHandledStatusToken(statusRequest.token);
    setStatusFilter(statusRequest.status || "all");
    setCurrentPage(1);
    setViewMode("list");
    onStatusRequestHandled?.();
  }, [
    statusRequest,
    loading,
    lastHandledStatusToken,
    onStatusRequestHandled,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading invoices...</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-100">Invoices</h2>
          <Button onClick={() => void handleCreateInvoice()}>
            <Plus size={16} className="mr-2" />
            New Invoice
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_180px] gap-2">
          <Input
            placeholder="Search invoices by number, customer, job, or date"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              ...invoiceStatuses.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              })),
              { value: "overdue", label: "Overdue" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={!showArchived ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowArchived(false)}
          >
            Active
          </Button>
          <Button
            variant={showArchived ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowArchived(true)}
          >
            Archived
          </Button>
        </div>

        {totalInvoices === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400">
                {searchTerm.trim()
                  ? "No invoices match your search."
                  : showArchived
                    ? "No archived invoices yet."
                    : "No invoices yet. Create one or convert a proposal into an invoice."}
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
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Job Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Due
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer"
                      onClick={() => handleLoadInvoice(invoice.id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                        {invoice.invoiceNumber ||
                          `INV-${invoice.id.toString().padStart(4, "0")}`}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                        {invoice.customer?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {invoice.jobName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={invoice.status} kind="invoice" />
                          <button
                            type="button"
                            title={
                              invoice.status === "draft"
                                ? "Clear draft hold"
                                : "Hold as draft"
                            }
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              invoice.status === "draft"
                                ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleManualStatusToggle(invoice, "draft");
                            }}
                          >
                            Draft
                          </button>
                          <button
                            type="button"
                            title={
                              invoice.status === "void"
                                ? "Unvoid invoice"
                                : "Void invoice"
                            }
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              invoice.status === "void"
                                ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleManualStatusToggle(invoice, "void");
                            }}
                          >
                            Void
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.dueDate ? (
                          <span
                            className={
                              isInvoiceOverdue(invoice)
                                ? "font-medium text-red-400"
                                : "text-zinc-400"
                            }
                          >
                            {formatDate(invoice.dueDate)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100 text-right">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-100 text-right">
                        {formatCurrency(invoice.balanceDue || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleQuickPrintInvoice(invoice.id);
                          }}
                          title="Print invoice"
                        >
                          <Printer size={14} className="text-zinc-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDuplicateInvoice(invoice.id);
                          }}
                          title="Duplicate invoice"
                        >
                          <Copy size={14} className="text-zinc-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setInvoiceActionMenu((prev) =>
                              prev?.invoiceId === invoice.id
                                ? null
                                : {
                                    invoiceId: invoice.id,
                                    top: rect.bottom + 4,
                                    left: rect.right - 176,
                                  }
                            );
                          }}
                          title="More actions"
                        >
                          <MoreVertical size={14} className="text-zinc-400" />
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
                  onChange={(e) =>
                    setPageSize(parseInt(e.target.value, 10) || 10)
                  }
                  className="px-2 py-1 text-xs border border-zinc-600 rounded bg-zinc-800 text-zinc-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <p className="text-xs text-zinc-400">
                  Showing{" "}
                  {totalInvoices === 0
                    ? 0
                    : (currentPage - 1) * pageSize + 1}
                  -{Math.min(currentPage * pageSize, totalInvoices)} of{" "}
                  {totalInvoices}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}

        {invoiceActionMenu && (() => {
          const menuInvoice = invoices.find(
            (invoice) => invoice.id === invoiceActionMenu.invoiceId,
          );
          if (!menuInvoice) return null;

          return (
            <RowActionMenu
              top={invoiceActionMenu.top}
              left={invoiceActionMenu.left}
              onClose={() => setInvoiceActionMenu(null)}
              items={[
                {
                  label: menuInvoice.archived ? "Restore" : "Archive",
                  icon: menuInvoice.archived ? (
                    <ArchiveRestore size={14} />
                  ) : (
                    <Archive size={14} />
                  ),
                  onClick: () =>
                    void handleArchiveToggle(
                      menuInvoice,
                      !Boolean(menuInvoice.archived),
                    ),
                },
                {
                  label: "Delete",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => openDeleteModal(menuInvoice),
                },
              ]}
            />
          );
        })()}

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setInvoiceToDelete(null);
            setIsDeleteModalOpen(false);
          }}
          title="Delete Invoice"
        >
          <div className="space-y-4">
            <p className="text-zinc-300">
              Are you sure you want to delete
              {invoiceToDelete
                ? ` "${invoiceToDelete.invoiceNumber || invoiceToDelete.jobName}"`
                : " this invoice"}
              ?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setInvoiceToDelete(null);
                  setIsDeleteModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteInvoice}>
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
      <style type="text/css" media="print">
        {`
          @page {
            size: auto;
            margin: 0mm;
          }
          @media print {
            .invoice-sheet {
              padding: 5mm !important;
            }
          }
        `}
      </style>
      <section className="print-only invoice-print">
        <div className="invoice-sheet max-w-[900px] mx-auto px-8 py-7 text-black bg-white">
          <div className="grid grid-cols-2 gap-8 mb-5">
            <div>
              <h1 className="text-[22px] font-semibold leading-none tracking-tight">
                {companySettings?.companyName || "CabCon"}
              </h1>
              {companySettings?.addressLine1 && (
                <p className="text-[14px] mt-3 leading-tight">
                  {companySettings.addressLine1}
                </p>
              )}
              {companySettings?.addressLine2 && (
                <p className="text-[14px] leading-tight">
                  {companySettings.addressLine2}
                </p>
              )}
              {(companySettings?.phone || companySettings?.email) && (
                <p className="text-[14px] mt-3 leading-tight">
                  {companySettings?.phone || ""}
                  {companySettings?.phone && companySettings?.email
                    ? " | "
                    : ""}
                  {companySettings?.email || ""}
                </p>
              )}
            </div>

            <div className="text-right text-[14px] leading-tight pt-1">
              {selectedCustomer?.name && (
                <p className="font-bold text-[16px]">{selectedCustomer.name}</p>
              )}
              {selectedCustomer?.address && (
                <p>{selectedCustomer.address}</p>
              )}
              {selectedCustomer?.phone && <p>{selectedCustomer.phone}</p>}
              {selectedCustomer?.email && <p>{selectedCustomer.email}</p>}
            </div>
          </div>

          <div className="flex justify-end mb-2 text-[14px] leading-tight">
            <div className="w-[260px]">
              <p className="flex justify-between">
                <span className="font-semibold">Invoice #</span>
                <span>
                  {currentInvoice?.invoiceNumber ||
                    `INV-${currentInvoice?.id?.toString().padStart(4, "0") || ""}`}
                </span>
              </p>
              <p className="flex justify-between mt-2">
                <span className="font-semibold">Date</span>
                <span>{form.invoiceDate ? formatDate(dateInputToISO(form.invoiceDate)) : ""}</span>
              </p>
              {form.dueDate && (
                <p className="flex justify-between mt-2">
                  <span className="font-semibold">Due</span>
                  <span>{formatDate(dateInputToISO(form.dueDate))}</span>
                </p>
              )}
              <p className="flex justify-between mt-2">
                <span className="font-semibold">Job</span>
                <span>{form.jobName}</span>
              </p>
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
                  <div
                    key={`${item.itemName}-${index}`}
                    className="grid grid-cols-[1fr_120px] gap-4"
                  >
                    <div>
                      <p className="font-medium">{item.itemName || "Item"}</p>
                      {item.description && (
                        <p className="text-[12px] mt-0.5 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {formatCurrency(item.lineTotal || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.notes && (
              <div className="mt-6 text-[12px] leading-[1.4] font-semibold">
                <p className="whitespace-pre-wrap">{form.notes}</p>
              </div>
            )}

            {form.payments.length > 0 && (
              <div className="mt-6">
                <div className="border-b border-black pb-1 mb-2 text-[13px] font-semibold leading-none">
                  Payments
                </div>
                <div className="text-[12px] leading-[1.45]">
                  {form.payments.map((payment) => (
                    <div
                      key={payment.clientId}
                      className="grid grid-cols-[100px_120px_1fr_100px] gap-3 border-b border-black/20 py-1"
                    >
                      <span>
                        {payment.paymentDate
                          ? formatDate(dateInputToISO(payment.paymentDate))
                          : ""}
                      </span>
                      <span>{paymentMethodLabel(payment.method)}</span>
                      <span>{paymentDetailText(payment)}</span>
                      <span className="text-right">
                        {formatCurrency(payment.amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_420px] gap-8 mt-16 items-end">
            <div className="text-[10px] leading-[1.35] max-w-[280px]">
              <p>{companySettings?.defaultTermsBlock1}</p>
              <p className="mt-3">{companySettings?.defaultTermsBlock2}</p>
              {companySettings?.defaultTermsBlock3 && (
                <p className="mt-3">{companySettings?.defaultTermsBlock3}</p>
              )}
            </div>

            <div className="w-full text-[14px] leading-tight">
              <div className="flex justify-between py-1.5">
                <span className="font-semibold">Subtotal</span>
                <span>{formatCurrency(form.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-black py-1.5">
                <span className="font-semibold">Tax</span>
                <span>{formatCurrency(form.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-black py-1.5 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(form.total)}</span>
              </div>
              <div className="flex justify-between border-t border-black py-1.5">
                <span className="font-semibold">Amount Paid</span>
                <span>{formatCurrency(form.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-black py-1.5 font-semibold">
                <span>Balance Due</span>
                <span>{formatCurrency(form.balanceDue)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                void (async () => {
                  await flushAutosave();
                  setCurrentInvoice(null);
                  setIsCreatingInvoice(false);
                  setForm(defaultForm);
                  setDraftLineItem(defaultDraftLineItem);
        setDraftPayment(defaultDraftPayment);
                  setViewMode("list");
                })();
              }}
            >
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">
                {selectedCustomer?.name || "No customer selected"}
              </h2>
              <p className="text-sm text-zinc-400">
                {form.jobName || "Invoice"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isCreatingInvoice && (
              <Button
                variant="ghost"
                onClick={() => void handleCancelNewInvoice()}
              >
                Cancel
              </Button>
            )}
            <Button variant="secondary" onClick={() => void handleSaveInvoice()}>
              <Save size={16} className="mr-2" />
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleSaveInvoicePDF()}
            >
              <FileText size={16} className="mr-2" />
              Save PDF
            </Button>
            <Button onClick={handlePrintInvoice}>
              <Printer size={16} className="mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="space-y-4 w-full">
          <div className="space-y-4 w-full">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-zinc-100">Invoice Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <CustomerCombobox
                    label="Customer"
                    customers={customers}
                    value={form.customerId}
                    onChange={(customerId) =>
                      setForm((prev) => ({ ...prev, customerId }))
                    }
                    placeholder="Search customer..."
                    onAddNewCustomer={() => setIsAddCustomerModalOpen(true)}
                  />
                  <Input
                    label="Job Name"
                    value={form.jobName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, jobName: e.target.value }))
                    }
                    placeholder="e.g., Kitchen + Laundry Cabinet Package"
                  />
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={effectiveStatus} kind="invoice" />
                      <button
                        type="button"
                        title={
                          form.status === "draft"
                            ? "Clear draft hold"
                            : "Hold as draft"
                        }
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          form.status === "draft"
                            ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                            : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                        }`}
                        onClick={() => toggleFormStatus("draft")}
                      >
                        Draft
                      </button>
                      <button
                        type="button"
                        title={
                          form.status === "void"
                            ? "Unvoid invoice"
                            : "Void invoice"
                        }
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          form.status === "void"
                            ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                            : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                        }`}
                        onClick={() => toggleFormStatus("void")}
                      >
                        Void
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={form.invoiceDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          invoiceDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                  </div>
                  <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
                      Invoice Info
                    </p>
                    <p className="text-sm text-zinc-100">
                      Invoice #: {currentInvoice?.invoiceNumber || "-"}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {currentInvoice?.sourceQuoteId
                        ? `From Proposal #${currentInvoice.sourceQuoteId}`
                        : "Not linked to a proposal"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-zinc-300">
                    Line Items
                  </label>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_140px_110px] gap-2">
                      <Input
                        placeholder="Item"
                        value={draftLineItem.itemName}
                        onChange={(e) =>
                          setDraftLineItem((prev) => ({
                            ...prev,
                            itemName: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Total"
                        type="number"
                        step="0.01"
                        value={draftLineItem.lineTotal}
                        onKeyDown={preventNumberArrowAdjust}
                        onChange={(e) =>
                          setDraftLineItem((prev) => ({
                            ...prev,
                            lineTotal: e.target.value,
                          }))
                        }
                      />
                      <Button onClick={handleAddLineItem}>Add Item</Button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Description"
                      value={draftLineItem.description}
                      onChange={(e) =>
                        setDraftLineItem((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
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
                      <div className="px-3 py-4 text-sm text-zinc-500">
                        No line items yet
                      </div>
                    ) : (
                      <SortableList
                        items={form.lineItems}
                        onReorder={reorderLineItems}
                        keyExtractor={(item) => item.clientId}
                        className="space-y-2 p-2"
                        renderItem={(item) => {
                          const index = form.lineItems.findIndex(
                            (entry) => entry.clientId === item.clientId,
                          );
                          return (
                            <LineItemEditorRow
                              item={item}
                              index={index}
                              showDragHandle
                              onUpdateLineItem={updateLineItem}
                              onRemoveLineItem={removeLineItem}
                              onPreventNumberArrowAdjust={
                                preventNumberArrowAdjust
                              }
                            />
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-zinc-100">Payments</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[140px_1fr_160px_1fr] gap-2 items-end">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draftPayment.amount}
                      onKeyDown={preventNumberArrowAdjust}
                      onChange={(e) =>
                        setDraftPayment((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={draftPayment.paymentDate}
                      onChange={(e) =>
                        setDraftPayment((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Method
                    </label>
                    <Select
                      value={draftPayment.method}
                      onChange={(value) =>
                        setDraftPayment((prev) => ({ ...prev, method: value }))
                      }
                      options={paymentMethodOptions}
                    />
                  </div>
                  <div>
                    {draftPayment.method === "credit_card" && (
                      <>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Card Type
                        </label>
                        <Select
                          value={draftPayment.cardType}
                          onChange={(value) =>
                            setDraftPayment((prev) => ({
                              ...prev,
                              cardType: value,
                            }))
                          }
                          options={cardTypeOptions}
                        />
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Last 4
                          </label>
                          <Input
                            inputMode="numeric"
                            maxLength={4}
                            value={draftPayment.cardLast4}
                            onChange={(e) =>
                              setDraftPayment((prev) => ({
                                ...prev,
                                cardLast4: sanitizeCardLast4(e.target.value),
                              }))
                            }
                            placeholder="4242"
                            className="w-24"
                          />
                        </div>
                      </>
                    )}
                    {draftPayment.method === "check" && (
                      <>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Check Number
                        </label>
                        <Input
                          value={draftPayment.checkNumber}
                          onChange={(e) =>
                            setDraftPayment((prev) => ({
                              ...prev,
                              checkNumber: e.target.value,
                            }))
                          }
                          placeholder="e.g., 1042"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddPayment}>Add Payment</Button>
                </div>

                <div className="rounded-lg border border-zinc-700 overflow-hidden">
                  <div className="grid grid-cols-[120px_140px_1fr_140px_70px] gap-2 px-3 py-2 bg-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                    <span>Date</span>
                    <span>Method</span>
                    <span>Detail</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>
                  {form.payments.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-zinc-500">
                      No payments yet
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {form.payments.map((payment, index) => (
                        <div
                          key={payment.clientId}
                          className="grid grid-cols-[120px_140px_1fr_140px_70px] gap-2 px-3 py-2 items-center"
                        >
                          <span className="text-sm text-zinc-300">
                            {payment.paymentDate
                              ? formatDate(
                                  dateInputToISO(payment.paymentDate),
                                )
                              : "-"}
                          </span>
                          <span className="text-sm text-zinc-300">
                            {paymentMethodLabel(payment.method)}
                          </span>
                          <span className="text-sm text-zinc-400">
                            {paymentDetailText(payment)}
                          </span>
                          <span className="text-sm text-zinc-100 text-right">
                            {formatCurrency(payment.amount || 0)}
                          </span>
                          <span className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePayment(index)}
                              title="Remove payment"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-zinc-100">Notes</h3>
                </CardHeader>
                <CardContent>
                  <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add notes that will appear on the invoice..."
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-zinc-100">Totals</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Line Items Subtotal</span>
                    <span className="text-zinc-100">
                      {formatCurrency(lineItemsSubtotal)}
                    </span>
                  </div>
                  <Input
                    label="Subtotal"
                    type="number"
                    step="0.01"
                    value={form.subtotal === 0 ? "" : form.subtotal.toFixed(2)}
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
                    value={form.tax === 0 ? "" : form.tax.toFixed(2)}
                    onKeyDown={preventNumberArrowAdjust}
                    readOnly
                  />
                  <Input
                    label="Total"
                    type="number"
                    step="0.01"
                    value={form.total === 0 ? "" : form.total.toFixed(2)}
                    onKeyDown={preventNumberArrowAdjust}
                    readOnly
                  />
                  <Input
                    label="Amount Paid"
                    type="number"
                    step="0.01"
                    value={
                      form.amountPaid === 0 ? "" : form.amountPaid.toFixed(2)
                    }
                    onKeyDown={preventNumberArrowAdjust}
                    readOnly
                  />
                  <Input
                    label="Balance Due"
                    type="number"
                    step="0.01"
                    value={
                      form.balanceDue === 0 ? "" : form.balanceDue.toFixed(2)
                    }
                    onKeyDown={preventNumberArrowAdjust}
                    readOnly
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Add Customer"
      >
        <CustomerForm
          onCancel={() => setIsAddCustomerModalOpen(false)}
          onSubmit={(data) => void handleCreateCustomer(data)}
        />
      </Modal>
    </>
  );
}