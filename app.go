package main

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/services"
	"cabinet-estimator/internal/types"
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	customerService  *services.CustomerService
	categoryService  *services.CategoryService
	priceListService *services.PriceListService
	estimateService  *services.EstimateService
	pdfService       *services.PDFService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Initialize services
	a.customerService = services.NewCustomerService()
	a.categoryService = services.NewCategoryService()
	a.priceListService = services.NewPriceListService()
	a.estimateService = services.NewEstimateService()
	a.pdfService = services.NewPDFService()
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	database.CloseDB()
}

// ==================== Customer Methods ====================

func (a *App) GetAllCustomers() ([]database.Customer, error) {
	return a.customerService.GetAll()
}

func (a *App) GetCustomer(id uint) (*database.Customer, error) {
	return a.customerService.GetByID(id)
}

func (a *App) CreateCustomer(req types.CreateCustomerRequest) (*database.Customer, error) {
	return a.customerService.Create(req)
}

func (a *App) UpdateCustomer(id uint, req types.CreateCustomerRequest) (*database.Customer, error) {
	return a.customerService.Update(id, req)
}

func (a *App) DeleteCustomer(id uint) error {
	return a.customerService.Delete(id)
}

// ==================== Category Methods ====================

func (a *App) GetAllCategories() ([]database.Category, error) {
	return a.categoryService.GetAll()
}

func (a *App) GetAllCategoriesWithItems() ([]database.Category, error) {
	return a.categoryService.GetAllWithItems()
}

func (a *App) GetCategory(id uint) (*database.Category, error) {
	return a.categoryService.GetByID(id)
}

func (a *App) CreateCategory(req types.CreateCategoryRequest) (*database.Category, error) {
	return a.categoryService.Create(req)
}

func (a *App) UpdateCategory(id uint, req types.CreateCategoryRequest) (*database.Category, error) {
	return a.categoryService.Update(id, req)
}

func (a *App) DeleteCategory(id uint) error {
	return a.categoryService.Delete(id)
}

func (a *App) UpdateCategorySortOrder(updates []types.SortOrderUpdate) error {
	return a.categoryService.UpdateSortOrder(updates)
}

// ==================== PriceList Methods ====================

func (a *App) GetAllPriceListItems() ([]database.PriceListItem, error) {
	return a.priceListService.GetAll()
}

func (a *App) GetPriceListItemsByCategory(categoryID uint) ([]database.PriceListItem, error) {
	return a.priceListService.GetByCategory(categoryID)
}

func (a *App) GetPriceListItem(id uint) (*database.PriceListItem, error) {
	return a.priceListService.GetByID(id)
}

func (a *App) CreatePriceListItem(req types.CreatePriceListItemRequest) (*database.PriceListItem, error) {
	return a.priceListService.Create(req)
}

func (a *App) UpdatePriceListItem(id uint, req types.CreatePriceListItemRequest) (*database.PriceListItem, error) {
	return a.priceListService.Update(id, req)
}

func (a *App) DeletePriceListItem(id uint) error {
	return a.priceListService.Delete(id)
}

func (a *App) UpdatePriceListItemSortOrder(updates []types.SortOrderUpdate) error {
	return a.priceListService.UpdateSortOrder(updates)
}

// ==================== Estimate Methods ====================

func (a *App) GetAllEstimates() ([]database.EstimateJob, error) {
	return a.estimateService.GetAll()
}

func (a *App) GetEstimate(id uint) (*database.EstimateJob, error) {
	return a.estimateService.GetByID(id)
}

func (a *App) GetEstimatesByCustomer(customerID uint) ([]database.EstimateJob, error) {
	return a.estimateService.GetByCustomer(customerID)
}

func (a *App) CreateEstimate(req types.CreateEstimateJobRequest) (*database.EstimateJob, error) {
	return a.estimateService.Create(req)
}

func (a *App) UpdateEstimate(req types.UpdateEstimateJobRequest) (*database.EstimateJob, error) {
	return a.estimateService.Update(req)
}

func (a *App) DeleteEstimate(id uint) error {
	return a.estimateService.Delete(id)
}

func (a *App) AddLineItem(req types.CreateLineItemRequest) (*database.EstimateLineItem, error) {
	return a.estimateService.AddLineItem(req)
}

func (a *App) UpdateLineItem(req types.UpdateLineItemRequest) (*database.EstimateLineItem, error) {
	return a.estimateService.UpdateLineItem(req)
}

func (a *App) DeleteLineItem(id uint) error {
	return a.estimateService.DeleteLineItem(id)
}

func (a *App) UpdateLineItemSortOrder(updates []types.SortOrderUpdate) error {
	return a.estimateService.UpdateLineItemSortOrder(updates)
}

func (a *App) UpdateEstimateSortOrder(updates []types.SortOrderUpdate) error {
	return a.estimateService.UpdateJobSortOrder(updates)
}

// ==================== PDF Methods ====================

func (a *App) GenerateEstimatePDF(jobID uint) (string, error) {
	return a.pdfService.GenerateEstimatePDF(jobID)
}

func (a *App) OpenFileInDefaultApp(filePath string) {
	runtime.BrowserOpenURL(a.ctx, "file://"+filePath)
}
