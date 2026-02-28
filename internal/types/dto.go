package types

// SortOrderUpdate is the DTO from frontend for reordering
type SortOrderUpdate struct {
	ID        uint `json:"id"`
	SortOrder int  `json:"sortOrder"`
}

// CreateCustomerRequest is the DTO for creating a customer
type CreateCustomerRequest struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
}

// CreateCategoryRequest is the DTO for creating a category
type CreateCategoryRequest struct {
	Name string `json:"name"`
}

// CreatePriceListItemRequest is the DTO for creating a price list item
type CreatePriceListItemRequest struct {
	ItemName   string  `json:"itemName"`
	UnitPrice  float64 `json:"unitPrice"`
	CategoryID uint    `json:"categoryId"`
}

// CreateEstimateJobRequest is the DTO for creating an estimate job
type CreateEstimateJobRequest struct {
	CustomerID    uint    `json:"customerId"`
	JobName       string  `json:"jobName"`
	MarkupPercent float64 `json:"markupPercent"`
	MiscCharge    float64 `json:"miscCharge"`
}

// CreateLineItemRequest is the DTO for creating an estimate line item
type CreateLineItemRequest struct {
	JobID        uint    `json:"jobId"`
	ItemName     string  `json:"itemName"`
	CategoryName string  `json:"categoryName"`
	Quantity     float64 `json:"quantity"`
	UnitPrice    float64 `json:"unitPrice"`
}

// UpdateEstimateJobRequest is the DTO for updating an estimate job
type UpdateEstimateJobRequest struct {
	JobID         uint    `json:"jobId"`
	CustomerID    uint    `json:"customerId"`
	JobName       string  `json:"jobName"`
	TotalAmount   float64 `json:"totalAmount"`
	InstallTotal  float64 `json:"installTotal"`
	MarkupPercent float64 `json:"markupPercent"`
	MiscCharge    float64 `json:"miscCharge"`
}

// UpdateLineItemRequest is the DTO for updating an estimate line item
type UpdateLineItemRequest struct {
	ID           uint    `json:"id"`
	ItemName     string  `json:"itemName"`
	CategoryName string  `json:"categoryName"`
	Quantity     float64 `json:"quantity"`
	UnitPrice    float64 `json:"unitPrice"`
}
