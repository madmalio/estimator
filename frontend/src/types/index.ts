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
  estimateDate: string;
  totalAmount: number;
  installTotal: number;
  installQty: number;
  installRate: number;
  markupPercent: number;
  miscCharge: number;
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

export interface EstimatePageResponse {
  items: EstimateJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateManualQuoteRequest {
  customerId?: number;
  jobName: string;
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
  defaultTermsBlock1: string;
  defaultTermsBlock2: string;
  defaultTermsBlock3: string;
  defaultPaymentsNote: string;
  defaultCreditCardNote: string;
  defaultSignatureNote: string;
}
