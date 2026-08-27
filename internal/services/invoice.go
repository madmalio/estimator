package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"
)

type InvoiceService struct {
	db                 *gorm.DB
	manualQuoteService *ManualQuoteService
}

func normalizeInvoiceStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "draft", "unpaid", "partial", "paid", "void":
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return "unpaid"
	}
}

func normalizePaymentMethod(method string) string {
	switch strings.ToLower(strings.TrimSpace(method)) {
	case "credit_card", "check", "cash":
		return strings.ToLower(strings.TrimSpace(method))
	default:
		return "cash"
	}
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func sumPayments(payments []types.InvoicePaymentRequest) float64 {
	var total float64
	for _, payment := range payments {
		total += payment.Amount
	}
	return round2(total)
}

func NewInvoiceService() *InvoiceService {
	return &InvoiceService{
		db:                 database.GetDB(),
		manualQuoteService: NewManualQuoteService(),
	}
}

func (s *InvoiceService) GetAll() ([]database.Invoice, error) {
	var invoices []database.Invoice
	err := s.db.Preload("Customer").
		Order("sort_order DESC, invoice_date DESC").
		Find(&invoices).Error
	return invoices, err
}

func (s *InvoiceService) GetPage(req types.InvoicePageRequest) (*types.InvoicePageResponse, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	baseQuery := s.db.Model(&database.Invoice{}).
		Joins("LEFT JOIN customers ON customers.id = invoices.customer_id").
		Where("invoices.archived = ?", req.ShowArchived)

	if !req.ShowArchived {
		baseQuery = baseQuery.Where("customers.archived = ?", false)
	}

	search := strings.TrimSpace(req.Search)
	status := strings.TrimSpace(strings.ToLower(req.Status))
	if status != "" && status != "all" {
		baseQuery = baseQuery.Where("LOWER(invoices.status) = ?", status)
	}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		baseQuery = baseQuery.Where(
			"LOWER(invoices.invoice_number) LIKE ? OR LOWER(invoices.job_name) LIKE ? OR LOWER(customers.name) LIKE ? OR strftime('%m/%d/%Y', invoices.invoice_date) LIKE ?",
			like,
			like,
			like,
			like,
		)
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	var invoices []database.Invoice
	listQuery := s.db.Preload("Customer").
		Joins("LEFT JOIN customers ON customers.id = invoices.customer_id").
		Where("invoices.archived = ?", req.ShowArchived)

	if !req.ShowArchived {
		listQuery = listQuery.Where("customers.archived = ?", false)
	}

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		listQuery = listQuery.Where(
			"LOWER(invoices.invoice_number) LIKE ? OR LOWER(invoices.job_name) LIKE ? OR LOWER(customers.name) LIKE ? OR strftime('%m/%d/%Y', invoices.invoice_date) LIKE ?",
			like,
			like,
			like,
			like,
		)
	}

	if status != "" && status != "all" {
		listQuery = listQuery.Where("LOWER(invoices.status) = ?", status)
	}

	if err := listQuery.Order("invoices.sort_order DESC, invoices.invoice_date DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&invoices).Error; err != nil {
		return nil, err
	}

	return &types.InvoicePageResponse{
		Items:    invoices,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *InvoiceService) GetByID(id uint) (*database.Invoice, error) {
	var invoice database.Invoice
	err := s.db.Preload("Customer").Preload("LineItems", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("sort_order ASC")
	}).Preload("Payments", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("payment_date ASC, id ASC")
	}).First(&invoice, id).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (s *InvoiceService) Create(req types.CreateInvoiceRequest) (*database.Invoice, error) {
	var maxSortOrder int
	s.db.Model(&database.Invoice{}).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSortOrder)

	invoice := database.Invoice{
		SourceQuoteID: req.SourceQuoteID,
		CustomerID:    req.CustomerID,
		JobName:       req.JobName,
		Status:        normalizeInvoiceStatus(req.Status),
		InvoiceDate:   req.InvoiceDate,
		DueDate:       req.DueDate,
		Notes:         req.Notes,
		Subtotal:      req.Subtotal,
		Tax:           req.Tax,
		Total:         req.Total,
		AmountPaid:    req.AmountPaid,
		BalanceDue:    req.BalanceDue,
		SortOrder:     maxSortOrder + 1,
	}

	if invoice.InvoiceDate.IsZero() {
		invoice.InvoiceDate = time.Now()
	}
	if invoice.DueDate.IsZero() {
		invoice.DueDate = invoice.InvoiceDate.AddDate(0, 0, 14)
	}

	if err := s.db.Create(&invoice).Error; err != nil {
		return nil, err
	}

	if err := s.replaceLineItems(invoice.ID, req.LineItems); err != nil {
		return nil, err
	}
	if err := s.replaceInvoicePayments(invoice.ID, req.Payments); err != nil {
		return nil, err
	}

	invoice.AmountPaid = sumPayments(req.Payments)
	invoice.BalanceDue = round2(invoice.Total - invoice.AmountPaid)
	invoice.InvoiceNumber = fmt.Sprintf("INV-%04d", invoice.ID)
	if err := s.db.Save(&invoice).Error; err != nil {
		return nil, err
	}

	return s.GetByID(invoice.ID)
}

func (s *InvoiceService) Update(req types.UpdateInvoiceRequest) (*database.Invoice, error) {
	var invoice database.Invoice
	if err := s.db.First(&invoice, req.ID).Error; err != nil {
		return nil, err
	}

	invoice.CustomerID = req.CustomerID
	invoice.JobName = req.JobName
	invoice.Status = normalizeInvoiceStatus(req.Status)
	invoice.InvoiceDate = req.InvoiceDate
	invoice.DueDate = req.DueDate
	invoice.Notes = req.Notes
	invoice.Subtotal = req.Subtotal
	invoice.Tax = req.Tax
	invoice.Total = req.Total
	invoice.AmountPaid = sumPayments(req.Payments)
	invoice.BalanceDue = round2(invoice.Total - invoice.AmountPaid)

	if err := s.db.Save(&invoice).Error; err != nil {
		return nil, err
	}

	if err := s.replaceLineItems(invoice.ID, req.LineItems); err != nil {
		return nil, err
	}
	if err := s.replaceInvoicePayments(invoice.ID, req.Payments); err != nil {
		return nil, err
	}

	return s.GetByID(invoice.ID)
}

func (s *InvoiceService) UpdateArchived(id uint, archived bool) (*database.Invoice, error) {
	if err := s.db.Model(&database.Invoice{}).
		Where("id = ?", id).
		Update("archived", archived).Error; err != nil {
		return nil, err
	}
	return s.GetByID(id)
}

func (s *InvoiceService) UpdateStatus(id uint, status string) (*database.Invoice, error) {
	if err := s.db.Model(&database.Invoice{}).
		Where("id = ?", id).
		Update("status", normalizeInvoiceStatus(status)).Error; err != nil {
		return nil, err
	}
	return s.GetByID(id)
}

func (s *InvoiceService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("invoice_id = ?", id).Delete(&database.InvoiceLineItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&database.Invoice{}, id).Error
	})
}

func (s *InvoiceService) Duplicate(id uint) (*database.Invoice, error) {
	original, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	lineItems := make([]types.InvoiceLineItemRequest, 0, len(original.LineItems))
	for index, item := range original.LineItems {
		lineItems = append(lineItems, types.InvoiceLineItemRequest{
			ItemName:    item.ItemName,
			Description: item.Description,
			LineTotal:   item.LineTotal,
			SortOrder:   index,
		})
	}

	jobName := strings.TrimSpace(original.JobName)
	if jobName == "" {
		jobName = "Invoice"
	}

	req := types.CreateInvoiceRequest{
		SourceQuoteID: original.SourceQuoteID,
		CustomerID:    original.CustomerID,
		JobName:       jobName + " (Copy)",
		Status:        "unpaid",
		InvoiceDate:   time.Now(),
		DueDate:       time.Now().AddDate(0, 0, 14),
		Notes:         original.Notes,
		LineItems:     lineItems,
		Subtotal:      original.Subtotal,
		Tax:           original.Tax,
		Total:         original.Total,
		AmountPaid:    0,
		BalanceDue:    original.Total,
	}

	return s.Create(req)
}

func (s *InvoiceService) CreateFromProposal(quoteID uint) (*database.Invoice, error) {
	quote, err := s.manualQuoteService.GetByID(quoteID)
	if err != nil {
		return nil, err
	}

	lineItems := make([]types.InvoiceLineItemRequest, 0, len(quote.LineItems))
	for index, item := range quote.LineItems {
		lineItems = append(lineItems, types.InvoiceLineItemRequest{
			ItemName:    item.ItemName,
			Description: item.Description,
			LineTotal:   item.LineTotal,
			SortOrder:   index,
		})
	}

	invoiceDate := time.Now()
	req := types.CreateInvoiceRequest{
		SourceQuoteID: &quote.ID,
		CustomerID:    quote.CustomerID,
		JobName:       quote.JobName,
		Status:        "unpaid",
		InvoiceDate:   invoiceDate,
		DueDate:       invoiceDate.AddDate(0, 0, 14),
		Notes:         proposalNotesToPlainText(quote.DescriptionBody),
		LineItems:     lineItems,
		Subtotal:      quote.Subtotal,
		Tax:           quote.Tax,
		Total:         quote.Total,
		AmountPaid:    0,
		BalanceDue:    quote.Total,
	}

	return s.Create(req)
}

func proposalNotesToPlainText(descriptionBody string) string {
	trimmed := strings.TrimSpace(descriptionBody)
	if trimmed == "" {
		return ""
	}

	var meta struct {
		Notes []struct {
			Text string `json:"text"`
		} `json:"notes"`
		PaymentSchedule string `json:"paymentSchedule"`
	}
	if err := json.Unmarshal([]byte(trimmed), &meta); err != nil {
		return trimmed
	}

	if len(meta.Notes) > 0 {
		texts := make([]string, 0, len(meta.Notes))
		for _, note := range meta.Notes {
			if text := strings.TrimSpace(note.Text); text != "" {
				texts = append(texts, text)
			}
		}
		return strings.Join(texts, "\n\n")
	}

	if schedule := strings.TrimSpace(meta.PaymentSchedule); schedule != "" {
		return schedule
	}

	return ""
}

func (s *InvoiceService) replaceLineItems(invoiceID uint, items []types.InvoiceLineItemRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("invoice_id = ?", invoiceID).Delete(&database.InvoiceLineItem{}).Error; err != nil {
			return err
		}

		for index, item := range items {
			lineItem := database.InvoiceLineItem{
				InvoiceID:   invoiceID,
				ItemName:    item.ItemName,
				Description: item.Description,
				LineTotal:   item.LineTotal,
				SortOrder:   index,
			}
			if item.SortOrder > 0 {
				lineItem.SortOrder = item.SortOrder
			}

			if err := tx.Create(&lineItem).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *InvoiceService) replaceInvoicePayments(invoiceID uint, payments []types.InvoicePaymentRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("invoice_id = ?", invoiceID).Delete(&database.InvoicePayment{}).Error; err != nil {
			return err
		}

		for _, payment := range payments {
			entry := database.InvoicePayment{
				InvoiceID:   invoiceID,
				Amount:      payment.Amount,
				PaymentDate: payment.PaymentDate,
				Method:      normalizePaymentMethod(payment.Method),
				CardType:    payment.CardType,
				CheckNumber: payment.CheckNumber,
			}

			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
		}

		return nil
	})
}