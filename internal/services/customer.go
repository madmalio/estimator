package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"

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
	err := s.db.Order("name ASC").Find(&customers).Error
	return customers, err
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
		Name:    req.Name,
		Address: req.Address,
		Phone:   req.Phone,
		Email:   req.Email,
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

	if err := s.db.Save(&customer).Error; err != nil {
		return nil, err
	}
	return &customer, nil
}

func (s *CustomerService) Delete(id uint) error {
	return s.db.Delete(&database.Customer{}, id).Error
}
