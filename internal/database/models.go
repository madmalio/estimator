package database

import "time"

type Customer struct {
	ID      uint   `gorm:"primaryKey" json:"id"`
	Name    string `gorm:"not null" json:"name"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
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
