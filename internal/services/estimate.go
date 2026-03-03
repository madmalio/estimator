package services

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/types"
	"strings"
	"time"

	"gorm.io/gorm"
)

type EstimateService struct {
	db *gorm.DB
}

func NewEstimateService() *EstimateService {
	return &EstimateService{
		db: database.GetDB(),
	}
}

func (s *EstimateService) GetAll() ([]database.EstimateJob, error) {
	var jobs []database.EstimateJob
	err := s.db.Preload("Customer").
		Preload("LineItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Order("sort_order DESC, estimate_date DESC").
		Find(&jobs).Error
	return jobs, err
}

func (s *EstimateService) GetPage(req types.EstimatePageRequest) (*types.EstimatePageResponse, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	baseQuery := s.db.Model(&database.EstimateJob{}).
		Joins("LEFT JOIN customers ON customers.id = estimate_jobs.customer_id").
		Where("customers.archived = ?", false)

	search := strings.TrimSpace(req.Search)
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		baseQuery = baseQuery.Where(
			"LOWER(estimate_jobs.job_name) LIKE ? OR LOWER(customers.name) LIKE ? OR strftime('%m/%d/%Y', estimate_jobs.estimate_date) LIKE ?",
			like,
			like,
			like,
		)
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	var jobs []database.EstimateJob
	listQuery := s.db.Preload("Customer").
		Preload("LineItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Joins("LEFT JOIN customers ON customers.id = estimate_jobs.customer_id").
		Where("customers.archived = ?", false)

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		listQuery = listQuery.Where(
			"LOWER(estimate_jobs.job_name) LIKE ? OR LOWER(customers.name) LIKE ? OR strftime('%m/%d/%Y', estimate_jobs.estimate_date) LIKE ?",
			like,
			like,
			like,
		)
	}

	queryErr := listQuery.Order("estimate_jobs.sort_order DESC, estimate_jobs.estimate_date DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&jobs).Error
	if queryErr != nil {
		return nil, queryErr
	}

	return &types.EstimatePageResponse{
		Items:    jobs,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *EstimateService) GetByID(id uint) (*database.EstimateJob, error) {
	var job database.EstimateJob
	err := s.db.Preload("Customer").
		Preload("LineItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		First(&job, id).Error
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *EstimateService) GetByCustomer(customerID uint) ([]database.EstimateJob, error) {
	var jobs []database.EstimateJob
	err := s.db.Preload("Customer").
		Preload("LineItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Where("customer_id = ?", customerID).
		Order("estimate_date DESC").
		Find(&jobs).Error
	return jobs, err
}

func (s *EstimateService) Create(req types.CreateEstimateJobRequest) (*database.EstimateJob, error) {
	// Get the highest sort order
	var maxSortOrder int
	s.db.Model(&database.EstimateJob{}).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSortOrder)

	job := database.EstimateJob{
		CustomerID:    req.CustomerID,
		JobName:       req.JobName,
		EstimateDate:  time.Now(),
		InstallQty:    req.InstallQty,
		InstallRate:   req.InstallRate,
		InstallTotal:  req.InstallQty * req.InstallRate,
		MarkupPercent: req.MarkupPercent,
		MiscCharge:    req.MiscCharge,
		SortOrder:     maxSortOrder + 1,
	}
	err := s.db.Create(&job).Error
	if err != nil {
		return nil, err
	}

	// Reload with relationships
	return s.GetByID(job.JobID)
}

func (s *EstimateService) Update(req types.UpdateEstimateJobRequest) (*database.EstimateJob, error) {
	var job database.EstimateJob
	if err := s.db.First(&job, req.JobID).Error; err != nil {
		return nil, err
	}

	job.CustomerID = req.CustomerID
	job.JobName = req.JobName
	job.TotalAmount = req.TotalAmount
	job.InstallTotal = req.InstallTotal
	job.InstallQty = req.InstallQty
	job.InstallRate = req.InstallRate
	job.MarkupPercent = req.MarkupPercent
	job.MiscCharge = req.MiscCharge

	if err := s.db.Save(&job).Error; err != nil {
		return nil, err
	}
	return s.GetByID(job.JobID)
}

func (s *EstimateService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete all line items first
		if err := tx.Where("job_id = ?", id).Delete(&database.EstimateLineItem{}).Error; err != nil {
			return err
		}
		// Delete the job
		return tx.Delete(&database.EstimateJob{}, id).Error
	})
}

func (s *EstimateService) AddLineItem(req types.CreateLineItemRequest) (*database.EstimateLineItem, error) {
	// Get the highest sort order for this job
	var maxSortOrder int
	s.db.Model(&database.EstimateLineItem{}).
		Where("job_id = ?", req.JobID).
		Select("COALESCE(MAX(sort_order), -1)").
		Scan(&maxSortOrder)

	lineTotal := req.Quantity * req.UnitPrice

	item := database.EstimateLineItem{
		JobID:        req.JobID,
		ItemName:     req.ItemName,
		CategoryName: req.CategoryName,
		Quantity:     req.Quantity,
		UnitPrice:    req.UnitPrice,
		LineTotal:    lineTotal,
		SortOrder:    maxSortOrder + 1,
	}
	err := s.db.Create(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *EstimateService) UpdateLineItem(req types.UpdateLineItemRequest) (*database.EstimateLineItem, error) {
	var item database.EstimateLineItem
	if err := s.db.First(&item, req.ID).Error; err != nil {
		return nil, err
	}

	item.ItemName = req.ItemName
	item.CategoryName = req.CategoryName
	item.Quantity = req.Quantity
	item.UnitPrice = req.UnitPrice
	item.LineTotal = req.Quantity * req.UnitPrice

	if err := s.db.Save(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *EstimateService) DeleteLineItem(id uint) error {
	return s.db.Delete(&database.EstimateLineItem{}, id).Error
}

func (s *EstimateService) UpdateLineItemSortOrder(updates []types.SortOrderUpdate) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, u := range updates {
			if err := tx.Model(&database.EstimateLineItem{}).
				Where("id = ?", u.ID).
				Update("sort_order", u.SortOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *EstimateService) UpdateJobSortOrder(updates []types.SortOrderUpdate) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, u := range updates {
			if err := tx.Model(&database.EstimateJob{}).
				Where("job_id = ?", u.ID).
				Update("sort_order", u.SortOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
