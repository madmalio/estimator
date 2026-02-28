export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
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
