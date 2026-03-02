package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ManualQuoteService struct {
	db *gorm.DB
}

func NewManualQuoteService() *ManualQuoteService {
	return &ManualQuoteService{
		db: database.GetDB(),
	}
}

func (s *ManualQuoteService) GetAll() ([]database.ManualQuote, error) {
	var quotes []database.ManualQuote
	err := s.db.Preload("Customer").
		Order("sort_order DESC, quote_date DESC").
		Find(&quotes).Error
	return quotes, err
}

func (s *ManualQuoteService) GetByID(id uint) (*database.ManualQuote, error) {
	var quote database.ManualQuote
	err := s.db.Preload("Customer").Preload("LineItems", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("sort_order ASC")
	}).First(&quote, id).Error
	if err != nil {
		return nil, err
	}
	return &quote, nil
}

func (s *ManualQuoteService) Create(req types.CreateManualQuoteRequest) (*database.ManualQuote, error) {
	var maxSortOrder int
	s.db.Model(&database.ManualQuote{}).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSortOrder)

	quote := database.ManualQuote{
		CustomerID:      req.CustomerID,
		JobName:         req.JobName,
		QuoteDate:       time.Now(),
		DescriptionBody: req.DescriptionBody,
		Subtotal:        req.Subtotal,
		Tax:             req.Tax,
		Total:           req.Total,
		DepositPercent:  req.DepositPercent,
		DepositAmount:   req.DepositAmount,
		AmountDue:       req.AmountDue,
		TermsBlock1:     req.TermsBlock1,
		TermsBlock2:     req.TermsBlock2,
		PaymentsNote:    req.PaymentsNote,
		CreditCardNote:  req.CreditCardNote,
		SignatureNote:   req.SignatureNote,
		SortOrder:       maxSortOrder + 1,
	}

	if err := s.db.Create(&quote).Error; err != nil {
		return nil, err
	}

	if err := s.replaceLineItems(quote.ID, req.LineItems); err != nil {
		return nil, err
	}

	quote.QuoteNumber = fmt.Sprintf("MQ-%04d", quote.ID)
	if err := s.db.Save(&quote).Error; err != nil {
		return nil, err
	}

	return s.GetByID(quote.ID)
}

func (s *ManualQuoteService) Update(req types.UpdateManualQuoteRequest) (*database.ManualQuote, error) {
	var quote database.ManualQuote
	if err := s.db.First(&quote, req.ID).Error; err != nil {
		return nil, err
	}

	quote.CustomerID = req.CustomerID
	quote.JobName = req.JobName
	quote.DescriptionBody = req.DescriptionBody
	quote.Subtotal = req.Subtotal
	quote.Tax = req.Tax
	quote.Total = req.Total
	quote.DepositPercent = req.DepositPercent
	quote.DepositAmount = req.DepositAmount
	quote.AmountDue = req.AmountDue
	quote.TermsBlock1 = req.TermsBlock1
	quote.TermsBlock2 = req.TermsBlock2
	quote.PaymentsNote = req.PaymentsNote
	quote.CreditCardNote = req.CreditCardNote
	quote.SignatureNote = req.SignatureNote

	if err := s.db.Save(&quote).Error; err != nil {
		return nil, err
	}

	if err := s.replaceLineItems(quote.ID, req.LineItems); err != nil {
		return nil, err
	}

	return s.GetByID(quote.ID)
}

func (s *ManualQuoteService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("manual_quote_id = ?", id).Delete(&database.ManualQuoteLineItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&database.ManualQuote{}, id).Error
	})
}

func (s *ManualQuoteService) replaceLineItems(quoteID uint, items []types.ManualQuoteLineItemRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("manual_quote_id = ?", quoteID).Delete(&database.ManualQuoteLineItem{}).Error; err != nil {
			return err
		}

		for index, item := range items {
			lineItem := database.ManualQuoteLineItem{
				ManualQuoteID: quoteID,
				ItemName:      item.ItemName,
				Description:   item.Description,
				LineTotal:     item.LineTotal,
				SortOrder:     index,
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
