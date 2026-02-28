package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"

	"gorm.io/gorm"
)

type PriceListService struct {
	db *gorm.DB
}

func NewPriceListService() *PriceListService {
	return &PriceListService{
		db: database.GetDB(),
	}
}

func (s *PriceListService) GetAll() ([]database.PriceListItem, error) {
	var items []database.PriceListItem
	err := s.db.Order("category_id ASC, sort_order ASC").Find(&items).Error
	return items, err
}

func (s *PriceListService) GetByCategory(categoryID uint) ([]database.PriceListItem, error) {
	var items []database.PriceListItem
	err := s.db.Where("category_id = ?", categoryID).Order("sort_order ASC").Find(&items).Error
	return items, err
}

func (s *PriceListService) GetByID(id uint) (*database.PriceListItem, error) {
	var item database.PriceListItem
	err := s.db.First(&item, id).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *PriceListService) Create(req types.CreatePriceListItemRequest) (*database.PriceListItem, error) {
	// Get the highest sort order for this category
	var maxSortOrder int
	s.db.Model(&database.PriceListItem{}).
		Where("category_id = ?", req.CategoryID).
		Select("COALESCE(MAX(sort_order), -1)").
		Scan(&maxSortOrder)

	item := database.PriceListItem{
		ItemName:   req.ItemName,
		UnitPrice:  req.UnitPrice,
		CategoryID: req.CategoryID,
		SortOrder:  maxSortOrder + 1,
	}
	err := s.db.Create(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *PriceListService) Update(id uint, req types.CreatePriceListItemRequest) (*database.PriceListItem, error) {
	var item database.PriceListItem
	if err := s.db.First(&item, id).Error; err != nil {
		return nil, err
	}

	item.ItemName = req.ItemName
	item.UnitPrice = req.UnitPrice
	item.CategoryID = req.CategoryID

	if err := s.db.Save(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *PriceListService) Delete(id uint) error {
	return s.db.Delete(&database.PriceListItem{}, id).Error
}

func (s *PriceListService) UpdateSortOrder(updates []types.SortOrderUpdate) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, u := range updates {
			if err := tx.Model(&database.PriceListItem{}).
				Where("id = ?", u.ID).
				Update("sort_order", u.SortOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
