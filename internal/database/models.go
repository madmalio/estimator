package database

import "time"

type Customer struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Name     string `gorm:"not null" json:"name"`
	Address  string `json:"address"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Archived bool   `gorm:"default:false;index" json:"archived"`
}

type Category struct {
	ID        uint            `gorm:"primaryKey" json:"id"`
	Name      string          `gorm:"not null" json:"name"`
	SortOrder int             `gorm:"default:0" json:"sortOrder"`
	Items     []PriceListItem `gorm:"foreignKey:CategoryID" json:"items,omitempty"`
}

type PriceListItem struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	ItemName   string  `gorm:"not null" json:"itemName"`
	UnitPrice  float64 `gorm:"not null" json:"unitPrice"`
	SortOrder  int     `gorm:"default:0" json:"sortOrder"`
	CategoryID uint    `gorm:"not null" json:"categoryId"`
}

type EstimateJob struct {
	JobID         uint               `gorm:"primaryKey" json:"jobId"`
	CustomerID    uint               `gorm:"not null" json:"customerId"`
	Customer      Customer           `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	JobName       string             `gorm:"not null" json:"jobName"`
	EstimateDate  time.Time          `json:"estimateDate"`
	TotalAmount   float64            `json:"totalAmount"`
	InstallTotal  float64            `json:"installTotal"`
	MarkupPercent float64            `json:"markupPercent"`
	MiscCharge    float64            `json:"miscCharge"`
	SortOrder     int                `gorm:"default:0" json:"sortOrder"`
	LineItems     []EstimateLineItem `gorm:"foreignKey:JobID" json:"lineItems,omitempty"`
}

type EstimateLineItem struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	JobID        uint    `gorm:"not null" json:"jobId"`
	ItemName     string  `gorm:"not null" json:"itemName"`
	CategoryName string  `json:"categoryName"`
	Quantity     float64 `gorm:"not null" json:"quantity"`
	UnitPrice    float64 `gorm:"not null" json:"unitPrice"`
	LineTotal    float64 `gorm:"not null" json:"lineTotal"`
	SortOrder    int     `gorm:"default:0" json:"sortOrder"`
}

type CompanySettings struct {
	ID                    uint   `gorm:"primaryKey" json:"id"`
	CompanyName           string `json:"companyName"`
	AddressLine1          string `json:"addressLine1"`
	AddressLine2          string `json:"addressLine2"`
	Phone                 string `json:"phone"`
	Email                 string `json:"email"`
	Theme                 string `gorm:"default:'system'" json:"theme"`
	DefaultTermsBlock1    string `gorm:"type:text" json:"defaultTermsBlock1"`
	DefaultTermsBlock2    string `gorm:"type:text" json:"defaultTermsBlock2"`
	DefaultTermsBlock3    string `gorm:"type:text" json:"defaultTermsBlock3"`
	DefaultPaymentsNote   string `gorm:"type:text" json:"defaultPaymentsNote"`
	DefaultCreditCardNote string `gorm:"type:text" json:"defaultCreditCardNote"`
	DefaultSignatureNote  string `gorm:"type:text" json:"defaultSignatureNote"`
}

type TaxRate struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Rate      float64   `gorm:"not null" json:"rate"`
	IsDefault bool      `gorm:"default:false" json:"isDefault"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ManualQuote struct {
	ID              uint                  `gorm:"primaryKey" json:"id"`
	QuoteNumber     string                `json:"quoteNumber"`
	CustomerID      *uint                 `json:"customerId"`
	Customer        *Customer             `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	JobName         string                `json:"jobName"`
	QuoteDate       time.Time             `json:"quoteDate"`
	DescriptionBody string                `gorm:"type:text" json:"descriptionBody"`
	LineItems       []ManualQuoteLineItem `gorm:"foreignKey:ManualQuoteID" json:"lineItems,omitempty"`
	Subtotal        float64               `json:"subtotal"`
	Tax             float64               `json:"tax"`
	Total           float64               `json:"total"`
	DepositPercent  float64               `json:"depositPercent"`
	DepositAmount   float64               `json:"depositAmount"`
	AmountDue       float64               `json:"amountDue"`
	TermsBlock1     string                `gorm:"type:text" json:"termsBlock1"`
	TermsBlock2     string                `gorm:"type:text" json:"termsBlock2"`
	PaymentsNote    string                `gorm:"type:text" json:"paymentsNote"`
	CreditCardNote  string                `gorm:"type:text" json:"creditCardNote"`
	SignatureNote   string                `gorm:"type:text" json:"signatureNote"`
	SortOrder       int                   `gorm:"default:0" json:"sortOrder"`
	CreatedAt       time.Time             `json:"createdAt"`
	UpdatedAt       time.Time             `json:"updatedAt"`
}

type ManualQuoteLineItem struct {
	ID            uint    `gorm:"primaryKey" json:"id"`
	ManualQuoteID uint    `gorm:"not null;index" json:"manualQuoteId"`
	ItemName      string  `json:"itemName"`
	Description   string  `gorm:"type:text" json:"description"`
	LineTotal     float64 `json:"lineTotal"`
	SortOrder     int     `gorm:"default:0" json:"sortOrder"`
}
