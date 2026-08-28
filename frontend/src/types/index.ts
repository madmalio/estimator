export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  archived?: boolean;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  items?: PriceListItem[];
}

export interface PriceListItem {
  id: number;
  itemName: string;
  unitPrice: number;
  sortOrder: number;
  categoryId: number;
}

export interface EstimateJob {
  jobId: number;
  customerId: number;
  customer?: Customer;
  jobName: string;
  status: string;
  estimateDate: string;
  totalAmount: number;
  installTotal: number;
  installQty: number;
  installRate: number;
markupPercent: number;
  miscCharge: number;
  archived?: boolean;
  pdfRevision?: number;
  sortOrder: number;
  lineItems?: EstimateLineItem[];
}

export interface EstimateLineItem {
  id: number;
  jobId: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

export interface SortOrderUpdate {
  id: number;
  sortOrder: number;
}

export interface CreateCustomerRequest {
  name: string;
  address: string;
  phone: string;
  email: string;
  archived?: boolean;
}

export interface CustomerPageResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreatePriceListItemRequest {
  itemName: string;
  unitPrice: number;
  categoryId: number;
}

export interface CreateEstimateJobRequest {
  customerId: number;
  jobName: string;
  status: string;
  installQty: number;
  installRate: number;
  markupPercent: number;
  miscCharge: number;
}

export interface CreateLineItemRequest {
  jobId: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateEstimateJobRequest {
  jobId: number;
  customerId: number;
  jobName: string;
  status: string;
  totalAmount: number;
  installTotal: number;
  installQty: number;
  installRate: number;
  markupPercent: number;
  miscCharge: number;
}

export interface UpdateLineItemRequest {
  id: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
}

export interface CompanySettings {
  id: number;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  theme: string;
  openPdfAfterSave: boolean;
  defaultTermsBlock1: string;
  defaultTermsBlock2: string;
  defaultTermsBlock3: string;
  defaultPaymentsNote: string;
  defaultCreditCardNote: string;
  defaultSignatureNote: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRateRequest {
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface ManualQuote {
  id: number;
  quoteNumber: string;
  customerId?: number;
  customer?: Customer;
  jobName: string;
  status: string;
  quoteDate: string;
  descriptionBody: string;
  lineItems?: ManualQuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  depositPercent: number;
  depositAmount: number;
  amountDue: number;
  termsBlock1: string;
  termsBlock2: string;
  paymentsNote: string;
  creditCardNote: string;
signatureNote: string;
  archived?: boolean;
  pdfRevision?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManualQuotePageResponse {
  items: ManualQuote[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  sourceQuoteId?: number;
  customerId?: number;
  customer?: Customer;
  jobName: string;
  status: string;
  invoiceDate: string;
  notes: string;
  invoiceNotes: string;
  lineItems?: InvoiceLineItem[];
  payments?: InvoicePayment[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  archived?: boolean;
  pdfRevision?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  itemName: string;
  description: string;
  lineTotal: number;
  sortOrder: number;
}

export interface InvoicePayment {
  id: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  method: string;
  cardType: string;
  cardLast4: string;
  checkNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePaymentRequest {
  amount: number;
  paymentDate: string;
  method: string;
  cardType: string;
  cardLast4: string;
  checkNumber: string;
}

export interface InvoiceLineItemRequest {
  itemName: string;
  description: string;
  lineTotal: number;
  sortOrder: number;
}

export interface CreateInvoiceRequest {
  sourceQuoteId?: number;
  customerId?: number;
  jobName: string;
  status: string;
  invoiceDate: string;
  notes: string;
  invoiceNotes: string;
  lineItems: InvoiceLineItemRequest[];
  payments: InvoicePaymentRequest[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

export interface UpdateInvoiceRequest extends CreateInvoiceRequest {
  id: number;
}

export interface InvoicePageResponse {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GlobalSearchResult {
  type: 'customer' | 'proposal' | 'estimate' | 'invoice';
  id: number;
  title: string;
  subtitle: string;
  meta: string;
}

export interface EstimatePageResponse {
  items: EstimateJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateManualQuoteRequest {
  customerId?: number;
  jobName: string;
  status: string;
  descriptionBody: string;
  lineItems: ManualQuoteLineItemRequest[];
  subtotal: number;
  tax: number;
  total: number;
  depositPercent: number;
  depositAmount: number;
  amountDue: number;
  termsBlock1: string;
  termsBlock2: string;
  paymentsNote: string;
  creditCardNote: string;
  signatureNote: string;
}

export interface UpdateManualQuoteRequest extends CreateManualQuoteRequest {
  id: number;
}

export interface ManualQuoteLineItem {
  id: number;
  manualQuoteId: number;
  itemName: string;
  description: string;
  lineTotal: number;
  sortOrder: number;
}

export interface ManualQuoteLineItemRequest {
  itemName: string;
  description: string;
  lineTotal: number;
  sortOrder: number;
}

export interface UpdateCompanySettingsRequest {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  theme: string;
  openPdfAfterSave: boolean;
  defaultTermsBlock1: string;
  defaultTermsBlock2: string;
  defaultTermsBlock3: string;
  defaultPaymentsNote: string;
  defaultCreditCardNote: string;
  defaultSignatureNote: string;
}
