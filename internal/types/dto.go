package types

import "cabinet-estimator/internal/database"

// SortOrderUpdate is the DTO from frontend for reordering
type SortOrderUpdate struct {
	ID        uint `json:"id"`
	SortOrder int  `json:"sortOrder"`
}

// CreateCustomerRequest is the DTO for creating a customer
type CreateCustomerRequest struct {
	Name     string `json:"name"`
	Address  string `json:"address"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Archived bool   `json:"archived"`
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
	InstallQty    float64 `json:"installQty"`
	InstallRate   float64 `json:"installRate"`
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
	InstallQty    float64 `json:"installQty"`
	InstallRate   float64 `json:"installRate"`
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

// UpdateCompanySettingsRequest is the DTO for updating company settings
type UpdateCompanySettingsRequest struct {
	CompanyName           string `json:"companyName"`
	AddressLine1          string `json:"addressLine1"`
	AddressLine2          string `json:"addressLine2"`
	Phone                 string `json:"phone"`
	Email                 string `json:"email"`
	Theme                 string `json:"theme"`
	DefaultTermsBlock1    string `json:"defaultTermsBlock1"`
	DefaultTermsBlock2    string `json:"defaultTermsBlock2"`
	DefaultTermsBlock3    string `json:"defaultTermsBlock3"`
	DefaultPaymentsNote   string `json:"defaultPaymentsNote"`
	DefaultCreditCardNote string `json:"defaultCreditCardNote"`
	DefaultSignatureNote  string `json:"defaultSignatureNote"`
}

// CreateManualQuoteRequest is the DTO for creating a manual quote
type CreateManualQuoteRequest struct {
	CustomerID      *uint                        `json:"customerId"`
	JobName         string                       `json:"jobName"`
	DescriptionBody string                       `json:"descriptionBody"`
	LineItems       []ManualQuoteLineItemRequest `json:"lineItems"`
	Subtotal        float64                      `json:"subtotal"`
	Tax             float64                      `json:"tax"`
	Total           float64                      `json:"total"`
	DepositPercent  float64                      `json:"depositPercent"`
	DepositAmount   float64                      `json:"depositAmount"`
	AmountDue       float64                      `json:"amountDue"`
	TermsBlock1     string                       `json:"termsBlock1"`
	TermsBlock2     string                       `json:"termsBlock2"`
	PaymentsNote    string                       `json:"paymentsNote"`
	CreditCardNote  string                       `json:"creditCardNote"`
	SignatureNote   string                       `json:"signatureNote"`
}

// UpdateManualQuoteRequest is the DTO for updating a manual quote
type UpdateManualQuoteRequest struct {
	ID              uint                         `json:"id"`
	CustomerID      *uint                        `json:"customerId"`
	JobName         string                       `json:"jobName"`
	DescriptionBody string                       `json:"descriptionBody"`
	LineItems       []ManualQuoteLineItemRequest `json:"lineItems"`
	Subtotal        float64                      `json:"subtotal"`
	Tax             float64                      `json:"tax"`
	Total           float64                      `json:"total"`
	DepositPercent  float64                      `json:"depositPercent"`
	DepositAmount   float64                      `json:"depositAmount"`
	AmountDue       float64                      `json:"amountDue"`
	TermsBlock1     string                       `json:"termsBlock1"`
	TermsBlock2     string                       `json:"termsBlock2"`
	PaymentsNote    string                       `json:"paymentsNote"`
	CreditCardNote  string                       `json:"creditCardNote"`
	SignatureNote   string                       `json:"signatureNote"`
}

type ManualQuoteLineItemRequest struct {
	ItemName    string  `json:"itemName"`
	Description string  `json:"description"`
	LineTotal   float64 `json:"lineTotal"`
	SortOrder   int     `json:"sortOrder"`
}

type CreateTaxRateRequest struct {
	Name      string  `json:"name"`
	Rate      float64 `json:"rate"`
	IsDefault bool    `json:"isDefault"`
}

type CustomerPageRequest struct {
	Page         int    `json:"page"`
	PageSize     int    `json:"pageSize"`
	Search       string `json:"search"`
	ShowArchived bool   `json:"showArchived"`
}

type EstimatePageRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Search   string `json:"search"`
}

type ManualQuotePageRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Search   string `json:"search"`
}

type CustomerPageResponse struct {
	Items    []database.Customer `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
}

type EstimatePageResponse struct {
	Items    []database.EstimateJob `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
}

type ManualQuotePageResponse struct {
	Items    []database.ManualQuote `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
}
