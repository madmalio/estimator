package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"
	"strings"

	"gorm.io/gorm"
)

type CustomerService struct {
	db *gorm.DB
}

func NewCustomerService() *CustomerService {
	return &CustomerService{
		db: database.GetDB(),
	}
}

func (s *CustomerService) GetAll() ([]database.Customer, error) {
	var customers []database.Customer
	err := s.db.Order("archived ASC, name ASC").Find(&customers).Error
	return customers, err
}

func (s *CustomerService) GetPage(req types.CustomerPageRequest) (*types.CustomerPageResponse, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	query := s.db.Model(&database.Customer{}).Where("archived = ?", req.ShowArchived)

	search := strings.TrimSpace(req.Search)
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ? OR LOWER(address) LIKE ?",
			like,
			like,
			like,
			like,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var customers []database.Customer
	err := query.Order("name ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&customers).Error
	if err != nil {
		return nil, err
	}

	return &types.CustomerPageResponse{
		Items:    customers,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *CustomerService) GetByID(id uint) (*database.Customer, error) {
	var customer database.Customer
	err := s.db.First(&customer, id).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (s *CustomerService) Create(req types.CreateCustomerRequest) (*database.Customer, error) {
	customer := database.Customer{
		Name:     req.Name,
		Address:  req.Address,
		Phone:    req.Phone,
		Email:    req.Email,
		Archived: req.Archived,
	}
	err := s.db.Create(&customer).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (s *CustomerService) Update(id uint, req types.CreateCustomerRequest) (*database.Customer, error) {
	var customer database.Customer
	if err := s.db.First(&customer, id).Error; err != nil {
		return nil, err
	}

	customer.Name = req.Name
	customer.Address = req.Address
	customer.Phone = req.Phone
	customer.Email = req.Email
	customer.Archived = req.Archived

	if err := s.db.Save(&customer).Error; err != nil {
		return nil, err
	}
	return &customer, nil
}

func (s *CustomerService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		estimateIDs := tx.Model(&database.EstimateJob{}).
			Select("job_id").
			Where("customer_id = ?", id)

		if err := tx.Where("job_id IN (?)", estimateIDs).Delete(&database.EstimateLineItem{}).Error; err != nil {
			return err
		}

		if err := tx.Where("customer_id = ?", id).Delete(&database.EstimateJob{}).Error; err != nil {
			return err
		}

		manualQuoteIDs := tx.Model(&database.ManualQuote{}).
			Select("id").
			Where("customer_id = ?", id)

		if err := tx.Where("manual_quote_id IN (?)", manualQuoteIDs).Delete(&database.ManualQuoteLineItem{}).Error; err != nil {
			return err
		}

		if err := tx.Where("customer_id = ?", id).Delete(&database.ManualQuote{}).Error; err != nil {
			return err
		}

		return tx.Delete(&database.Customer{}, id).Error
	})
}
