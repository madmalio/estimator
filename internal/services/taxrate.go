package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"

	"gorm.io/gorm"
)

type TaxRateService struct {
	db *gorm.DB
}

func NewTaxRateService() *TaxRateService {
	return &TaxRateService{
		db: database.GetDB(),
	}
}

func (s *TaxRateService) GetAll() ([]database.TaxRate, error) {
	var taxRates []database.TaxRate
	err := s.db.Order("name asc").Find(&taxRates).Error
	return taxRates, err
}

func (s *TaxRateService) GetByID(id uint) (*database.TaxRate, error) {
	var taxRate database.TaxRate
	err := s.db.First(&taxRate, id).Error
	if err != nil {
		return nil, err
	}
	return &taxRate, nil
}

func (s *TaxRateService) Create(req types.CreateTaxRateRequest) (*database.TaxRate, error) {
	taxRate := database.TaxRate{
		Name:      req.Name,
		Rate:      req.Rate,
		IsDefault: req.IsDefault,
	}

	if taxRate.IsDefault {
		// Clear other defaults
		s.db.Model(&database.TaxRate{}).Where("is_default = ?", true).Update("is_default", false)
	}

	err := s.db.Create(&taxRate).Error
	if err != nil {
		return nil, err
	}
	return &taxRate, nil
}

func (s *TaxRateService) Update(id uint, req types.CreateTaxRateRequest) (*database.TaxRate, error) {
	taxRate, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	taxRate.Name = req.Name
	taxRate.Rate = req.Rate
	taxRate.IsDefault = req.IsDefault

	if taxRate.IsDefault {
		// Clear other defaults
		s.db.Model(&database.TaxRate{}).Where("id != ? AND is_default = ?", id, true).Update("is_default", false)
	}

	err = s.db.Save(taxRate).Error
	if err != nil {
		return nil, err
	}
	return taxRate, nil
}

func (s *TaxRateService) Delete(id uint) error {
	return s.db.Delete(&database.TaxRate{}, id).Error
}
