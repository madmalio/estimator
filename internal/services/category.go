package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"

	"gorm.io/gorm"
)

type CategoryService struct {
	db *gorm.DB
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		db: database.GetDB(),
	}
}

func (s *CategoryService) GetAll() ([]database.Category, error) {
	var categories []database.Category
	err := s.db.Order("sort_order ASC").Find(&categories).Error
	return categories, err
}

func (s *CategoryService) GetAllWithItems() ([]database.Category, error) {
	var categories []database.Category
	err := s.db.Preload("Items", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Order("sort_order ASC").Find(&categories).Error
	return categories, err
}

func (s *CategoryService) GetByID(id uint) (*database.Category, error) {
	var category database.Category
	err := s.db.Preload("Items", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (s *CategoryService) Create(req types.CreateCategoryRequest) (*database.Category, error) {
	// Get the highest sort order
	var maxSortOrder int
	s.db.Model(&database.Category{}).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSortOrder)

	category := database.Category{
		Name:      req.Name,
		SortOrder: maxSortOrder + 1,
	}
	err := s.db.Create(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (s *CategoryService) Update(id uint, req types.CreateCategoryRequest) (*database.Category, error) {
	var category database.Category
	if err := s.db.First(&category, id).Error; err != nil {
		return nil, err
	}

	category.Name = req.Name

	if err := s.db.Save(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (s *CategoryService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete all items in the category first
		if err := tx.Where("category_id = ?", id).Delete(&database.PriceListItem{}).Error; err != nil {
			return err
		}
		// Delete the category
		return tx.Delete(&database.Category{}, id).Error
	})
}

func (s *CategoryService) UpdateSortOrder(updates []types.SortOrderUpdate) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, u := range updates {
			if err := tx.Model(&database.Category{}).
				Where("id = ?", u.ID).
				Update("sort_order", u.SortOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
