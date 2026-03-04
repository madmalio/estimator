package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"

	"gorm.io/gorm"
)

const (
	defaultTermsBlock1    = "Pricing is subject to change without notice. All material is guaranteed to be as specified and completed in a substantial workmanlike manner."
	defaultTermsBlock2    = "A FINANCE CHARGE is computed by applying a period rate of 1.5% per month, which is an annual rate of 18% on past due accounts."
	defaultTermsBlock3    = "Any collection charges or legal fees must be paid by the customer. A 25% restocking charge must be paid on all cancelled orders. RETURN CHECK CHARGE $25.00."
	defaultPaymentsNote   = "Payments to be made as follows: 75% Deposit"
	defaultCreditCardNote = "* THERE WILL BE A 3% FEE ADDED TO ALL CREDIT CARD TRANSACTIONS *"
	defaultSignatureNote  = "By signing this document, the customer agrees to the services and conditions outlined in this document."
)

type SettingsService struct {
	db *gorm.DB
}

func NewSettingsService() *SettingsService {
	return &SettingsService{
		db: database.GetDB(),
	}
}

func (s *SettingsService) GetCompanySettings() (*database.CompanySettings, error) {
	var settings database.CompanySettings
	err := s.db.First(&settings, 1).Error
	if err == nil {
		return &settings, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	defaults := database.CompanySettings{
		ID:                    1,
		CompanyName:           "CabCon",
		Theme:                 "system",
		OpenPDFAfterSave:      true,
		DefaultTermsBlock1:    defaultTermsBlock1,
		DefaultTermsBlock2:    defaultTermsBlock2,
		DefaultTermsBlock3:    defaultTermsBlock3,
		DefaultPaymentsNote:   defaultPaymentsNote,
		DefaultCreditCardNote: defaultCreditCardNote,
		DefaultSignatureNote:  defaultSignatureNote,
	}

	if createErr := s.db.Create(&defaults).Error; createErr != nil {
		return nil, createErr
	}

	return &defaults, nil
}

func (s *SettingsService) UpdateCompanySettings(req types.UpdateCompanySettingsRequest) (*database.CompanySettings, error) {
	settings, err := s.GetCompanySettings()
	if err != nil {
		return nil, err
	}

	settings.CompanyName = req.CompanyName
	settings.AddressLine1 = req.AddressLine1
	settings.AddressLine2 = req.AddressLine2
	settings.Phone = req.Phone
	settings.Email = req.Email
	settings.Theme = req.Theme
	settings.OpenPDFAfterSave = req.OpenPDFAfterSave
	settings.DefaultTermsBlock1 = req.DefaultTermsBlock1
	settings.DefaultTermsBlock2 = req.DefaultTermsBlock2
	settings.DefaultTermsBlock3 = req.DefaultTermsBlock3
	settings.DefaultPaymentsNote = req.DefaultPaymentsNote
	settings.DefaultCreditCardNote = req.DefaultCreditCardNote
	settings.DefaultSignatureNote = req.DefaultSignatureNote

	if err := s.db.Save(settings).Error; err != nil {
		return nil, err
	}

	return settings, nil
}
