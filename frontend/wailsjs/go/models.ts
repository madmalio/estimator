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
	export class Customer {
	    id: number;
	    name: string;
	    address: string;
	    phone: string;
	    email: string;
	
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
	
	    static createFrom(source: any = {}) {
	        return new CreateCustomerRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	    }
	}
	export class CreateEstimateJobRequest {
	    customerId: number;
	    jobName: string;
	    markupPercent: number;
	    miscCharge: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateEstimateJobRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerId = source["customerId"];
	        this.jobName = source["jobName"];
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
	export class UpdateEstimateJobRequest {
	    jobId: number;
	    customerId: number;
	    jobName: string;
	    totalAmount: number;
	    installTotal: number;
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

}

