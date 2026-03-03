export namespace database {
	
	export class PriceListItem {
	    id: number;
	    itemName: string;
	    unitPrice: number;
	    sortOrder: number;
	    categoryId: number;
	
	    static createFrom(source: any = {}) {
	        return new PriceListItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.itemName = source["itemName"];
	        this.unitPrice = source["unitPrice"];
	        this.sortOrder = source["sortOrder"];
	        this.categoryId = source["categoryId"];
	    }
	}
	export class Category {
	    id: number;
	    name: string;
	    sortOrder: number;
	    items?: PriceListItem[];
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.sortOrder = source["sortOrder"];
	        this.items = this.convertValues(source["items"], PriceListItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CompanySettings {
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
	
	    static createFrom(source: any = {}) {
	        return new CompanySettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.companyName = source["companyName"];
	        this.addressLine1 = source["addressLine1"];
	        this.addressLine2 = source["addressLine2"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.theme = source["theme"];
	        this.defaultTermsBlock1 = source["defaultTermsBlock1"];
	        this.defaultTermsBlock2 = source["defaultTermsBlock2"];
	        this.defaultTermsBlock3 = source["defaultTermsBlock3"];
	        this.defaultPaymentsNote = source["defaultPaymentsNote"];
	        this.defaultCreditCardNote = source["defaultCreditCardNote"];
	        this.defaultSignatureNote = source["defaultSignatureNote"];
	    }
	}
	export class Customer {
	    id: number;
	    name: string;
	    address: string;
	    phone: string;
	    email: string;
	    archived: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Customer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.archived = source["archived"];
	    }
	}
	export class EstimateLineItem {
	    id: number;
	    jobId: number;
	    itemName: string;
	    categoryName: string;
	    quantity: number;
	    unitPrice: number;
	    lineTotal: number;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new EstimateLineItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.jobId = source["jobId"];
	        this.itemName = source["itemName"];
	        this.categoryName = source["categoryName"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.lineTotal = source["lineTotal"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class EstimateJob {
	    jobId: number;
	    customerId: number;
	    customer?: Customer;
	    jobName: string;
	    // Go type: time
	    estimateDate: any;
	    totalAmount: number;
	    installTotal: number;
	    installQty: number;
	    installRate: number;
	    markupPercent: number;
	    miscCharge: number;
	    sortOrder: number;
	    lineItems?: EstimateLineItem[];
	
	    static createFrom(source: any = {}) {
	        return new EstimateJob(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.jobId = source["jobId"];
	        this.customerId = source["customerId"];
	        this.customer = this.convertValues(source["customer"], Customer);
	        this.jobName = source["jobName"];
	        this.estimateDate = this.convertValues(source["estimateDate"], null);
	        this.totalAmount = source["totalAmount"];
	        this.installTotal = source["installTotal"];
	        this.installQty = source["installQty"];
	        this.installRate = source["installRate"];
	        this.markupPercent = source["markupPercent"];
	        this.miscCharge = source["miscCharge"];
	        this.sortOrder = source["sortOrder"];
	        this.lineItems = this.convertValues(source["lineItems"], EstimateLineItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ManualQuoteLineItem {
	    id: number;
	    manualQuoteId: number;
	    itemName: string;
	    description: string;
	    lineTotal: number;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new ManualQuoteLineItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.manualQuoteId = source["manualQuoteId"];
	        this.itemName = source["itemName"];
	        this.description = source["description"];
	        this.lineTotal = source["lineTotal"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class ManualQuote {
	    id: number;
	    quoteNumber: string;
	    customerId?: number;
	    customer?: Customer;
	    jobName: string;
	    // Go type: time
	    quoteDate: any;
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
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new ManualQuote(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.quoteNumber = source["quoteNumber"];
	        this.customerId = source["customerId"];
	        this.customer = this.convertValues(source["customer"], Customer);
	        this.jobName = source["jobName"];
	        this.quoteDate = this.convertValues(source["quoteDate"], null);
	        this.descriptionBody = source["descriptionBody"];
	        this.lineItems = this.convertValues(source["lineItems"], ManualQuoteLineItem);
	        this.subtotal = source["subtotal"];
	        this.tax = source["tax"];
	        this.total = source["total"];
	        this.depositPercent = source["depositPercent"];
	        this.depositAmount = source["depositAmount"];
	        this.amountDue = source["amountDue"];
	        this.termsBlock1 = source["termsBlock1"];
	        this.termsBlock2 = source["termsBlock2"];
	        this.paymentsNote = source["paymentsNote"];
	        this.creditCardNote = source["creditCardNote"];
	        this.signatureNote = source["signatureNote"];
	        this.sortOrder = source["sortOrder"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class TaxRate {
	    id: number;
	    name: string;
	    rate: number;
	    isDefault: boolean;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new TaxRate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.rate = source["rate"];
	        this.isDefault = source["isDefault"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace types {
	
	export class CreateCategoryRequest {
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new CreateCategoryRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	    }
	}
	export class CreateCustomerRequest {
	    name: string;
	    address: string;
	    phone: string;
	    email: string;
	    archived: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CreateCustomerRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.archived = source["archived"];
	    }
	}
	export class CreateEstimateJobRequest {
	    customerId: number;
	    jobName: string;
	    installQty: number;
	    installRate: number;
	    markupPercent: number;
	    miscCharge: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateEstimateJobRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerId = source["customerId"];
	        this.jobName = source["jobName"];
	        this.installQty = source["installQty"];
	        this.installRate = source["installRate"];
	        this.markupPercent = source["markupPercent"];
	        this.miscCharge = source["miscCharge"];
	    }
	}
	export class CreateLineItemRequest {
	    jobId: number;
	    itemName: string;
	    categoryName: string;
	    quantity: number;
	    unitPrice: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateLineItemRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.jobId = source["jobId"];
	        this.itemName = source["itemName"];
	        this.categoryName = source["categoryName"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	    }
	}
	export class ManualQuoteLineItemRequest {
	    itemName: string;
	    description: string;
	    lineTotal: number;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new ManualQuoteLineItemRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.itemName = source["itemName"];
	        this.description = source["description"];
	        this.lineTotal = source["lineTotal"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class CreateManualQuoteRequest {
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
	
	    static createFrom(source: any = {}) {
	        return new CreateManualQuoteRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerId = source["customerId"];
	        this.jobName = source["jobName"];
	        this.descriptionBody = source["descriptionBody"];
	        this.lineItems = this.convertValues(source["lineItems"], ManualQuoteLineItemRequest);
	        this.subtotal = source["subtotal"];
	        this.tax = source["tax"];
	        this.total = source["total"];
	        this.depositPercent = source["depositPercent"];
	        this.depositAmount = source["depositAmount"];
	        this.amountDue = source["amountDue"];
	        this.termsBlock1 = source["termsBlock1"];
	        this.termsBlock2 = source["termsBlock2"];
	        this.paymentsNote = source["paymentsNote"];
	        this.creditCardNote = source["creditCardNote"];
	        this.signatureNote = source["signatureNote"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreatePriceListItemRequest {
	    itemName: string;
	    unitPrice: number;
	    categoryId: number;
	
	    static createFrom(source: any = {}) {
	        return new CreatePriceListItemRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.itemName = source["itemName"];
	        this.unitPrice = source["unitPrice"];
	        this.categoryId = source["categoryId"];
	    }
	}
	export class CreateTaxRateRequest {
	    name: string;
	    rate: number;
	    isDefault: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CreateTaxRateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.rate = source["rate"];
	        this.isDefault = source["isDefault"];
	    }
	}
	export class CustomerPageRequest {
	    page: number;
	    pageSize: number;
	    search: string;
	    showArchived: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CustomerPageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.search = source["search"];
	        this.showArchived = source["showArchived"];
	    }
	}
	export class CustomerPageResponse {
	    items: database.Customer[];
	    total: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new CustomerPageResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], database.Customer);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EstimatePageRequest {
	    page: number;
	    pageSize: number;
	    search: string;
	
	    static createFrom(source: any = {}) {
	        return new EstimatePageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.search = source["search"];
	    }
	}
	export class EstimatePageResponse {
	    items: database.EstimateJob[];
	    total: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new EstimatePageResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], database.EstimateJob);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ManualQuotePageRequest {
	    page: number;
	    pageSize: number;
	    search: string;
	
	    static createFrom(source: any = {}) {
	        return new ManualQuotePageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.search = source["search"];
	    }
	}
	export class ManualQuotePageResponse {
	    items: database.ManualQuote[];
	    total: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new ManualQuotePageResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], database.ManualQuote);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SortOrderUpdate {
	    id: number;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new SortOrderUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class UpdateCompanySettingsRequest {
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
	
	    static createFrom(source: any = {}) {
	        return new UpdateCompanySettingsRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.companyName = source["companyName"];
	        this.addressLine1 = source["addressLine1"];
	        this.addressLine2 = source["addressLine2"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.theme = source["theme"];
	        this.defaultTermsBlock1 = source["defaultTermsBlock1"];
	        this.defaultTermsBlock2 = source["defaultTermsBlock2"];
	        this.defaultTermsBlock3 = source["defaultTermsBlock3"];
	        this.defaultPaymentsNote = source["defaultPaymentsNote"];
	        this.defaultCreditCardNote = source["defaultCreditCardNote"];
	        this.defaultSignatureNote = source["defaultSignatureNote"];
	    }
	}
	export class UpdateEstimateJobRequest {
	    jobId: number;
	    customerId: number;
	    jobName: string;
	    totalAmount: number;
	    installTotal: number;
	    installQty: number;
	    installRate: number;
	    markupPercent: number;
	    miscCharge: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateEstimateJobRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.jobId = source["jobId"];
	        this.customerId = source["customerId"];
	        this.jobName = source["jobName"];
	        this.totalAmount = source["totalAmount"];
	        this.installTotal = source["installTotal"];
	        this.installQty = source["installQty"];
	        this.installRate = source["installRate"];
	        this.markupPercent = source["markupPercent"];
	        this.miscCharge = source["miscCharge"];
	    }
	}
	export class UpdateLineItemRequest {
	    id: number;
	    itemName: string;
	    categoryName: string;
	    quantity: number;
	    unitPrice: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateLineItemRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.itemName = source["itemName"];
	        this.categoryName = source["categoryName"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	    }
	}
	export class UpdateManualQuoteRequest {
	    id: number;
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
	
	    static createFrom(source: any = {}) {
	        return new UpdateManualQuoteRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.customerId = source["customerId"];
	        this.jobName = source["jobName"];
	        this.descriptionBody = source["descriptionBody"];
	        this.lineItems = this.convertValues(source["lineItems"], ManualQuoteLineItemRequest);
	        this.subtotal = source["subtotal"];
	        this.tax = source["tax"];
	        this.total = source["total"];
	        this.depositPercent = source["depositPercent"];
	        this.depositAmount = source["depositAmount"];
	        this.amountDue = source["amountDue"];
	        this.termsBlock1 = source["termsBlock1"];
	        this.termsBlock2 = source["termsBlock2"];
	        this.paymentsNote = source["paymentsNote"];
	        this.creditCardNote = source["creditCardNote"];
	        this.signatureNote = source["signatureNote"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

