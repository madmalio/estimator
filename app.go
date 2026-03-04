package main

import (
	"cabinet-estimator/internal/database"
	"cabinet-estimator/internal/services"
	"cabinet-estimator/internal/types"
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx                context.Context
	customerService    *services.CustomerService
	categoryService    *services.CategoryService
	priceListService   *services.PriceListService
	estimateService    *services.EstimateService
	manualQuoteService *services.ManualQuoteService
	pdfService         *services.PDFService
	settingsService    *services.SettingsService
	taxRateService     *services.TaxRateService
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
	a.manualQuoteService = services.NewManualQuoteService()
	a.pdfService = services.NewPDFService()
	a.settingsService = services.NewSettingsService()
	a.taxRateService = services.NewTaxRateService()
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	database.CloseDB()
}

// ==================== Customer Methods ====================

func (a *App) GetAllCustomers() ([]database.Customer, error) {
	return a.customerService.GetAll()
}

func (a *App) GetCustomersPage(req types.CustomerPageRequest) (*types.CustomerPageResponse, error) {
	return a.customerService.GetPage(req)
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

func (a *App) GetEstimatesPage(req types.EstimatePageRequest) (*types.EstimatePageResponse, error) {
	return a.estimateService.GetPage(req)
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

func (a *App) DuplicateEstimate(id uint) (*database.EstimateJob, error) {
	return a.estimateService.Duplicate(id)
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

// ==================== Manual Quote Methods ====================

func (a *App) GetAllManualQuotes() ([]database.ManualQuote, error) {
	return a.manualQuoteService.GetAll()
}

func (a *App) GetManualQuotesPage(req types.ManualQuotePageRequest) (*types.ManualQuotePageResponse, error) {
	return a.manualQuoteService.GetPage(req)
}

func (a *App) GetManualQuote(id uint) (*database.ManualQuote, error) {
	return a.manualQuoteService.GetByID(id)
}

func (a *App) CreateManualQuote(req types.CreateManualQuoteRequest) (*database.ManualQuote, error) {
	return a.manualQuoteService.Create(req)
}

func (a *App) UpdateManualQuote(req types.UpdateManualQuoteRequest) (*database.ManualQuote, error) {
	return a.manualQuoteService.Update(req)
}

func (a *App) DeleteManualQuote(id uint) error {
	return a.manualQuoteService.Delete(id)
}

func (a *App) DuplicateManualQuote(id uint) (*database.ManualQuote, error) {
	return a.manualQuoteService.Duplicate(id)
}

// ==================== PDF Methods ====================

func (a *App) GenerateEstimatePDF(jobID uint, html string) (string, error) {
	return a.pdfService.GenerateEstimatePDF(jobID, html)
}

func (a *App) GenerateProposalPDF(quoteID uint, html string) (string, error) {
	return a.pdfService.GenerateManualQuotePDF(quoteID, html)
}

func (a *App) OpenFileInDefaultApp(filePath string) error {
	var attempts [][]string

	switch runtime.GOOS {
	case "windows":
		attempts = [][]string{
			{"rundll32", "url.dll,FileProtocolHandler", filePath},
			{"explorer", filePath},
			{"cmd", "/c", "start", "", filePath},
		}
	case "darwin":
		attempts = [][]string{{"open", filePath}}
	default:
		attempts = [][]string{{"xdg-open", filePath}}
	}

	var lastErr error
	for _, attempt := range attempts {
		if len(attempt) == 0 {
			continue
		}

		for retry := 0; retry < 3; retry++ {
			cmd := exec.Command(attempt[0], attempt[1:]...)
			if err := cmd.Start(); err == nil {
				return nil
			} else {
				lastErr = err
				time.Sleep(200 * time.Millisecond)
			}
		}
	}

	return fmt.Errorf("failed to open file %q: %w", filePath, lastErr)
}

func (a *App) SearchGlobal(query string) ([]types.GlobalSearchResult, error) {
	results := make([]types.GlobalSearchResult, 0)

	customerPage, err := a.customerService.GetPage(types.CustomerPageRequest{
		Page:         1,
		PageSize:     5,
		Search:       query,
		ShowArchived: false,
	})
	if err != nil {
		return nil, err
	}

	for _, customer := range customerPage.Items {
		results = append(results, types.GlobalSearchResult{
			Type:     "customer",
			ID:       customer.ID,
			Title:    customer.Name,
			Subtitle: "Customer",
			Meta:     strings.TrimSpace(strings.Trim(customer.Phone+" | "+customer.Email, " |")),
		})
	}

	proposalPage, err := a.manualQuoteService.GetPage(types.ManualQuotePageRequest{
		Page:     1,
		PageSize: 5,
		Search:   query,
		Status:   "all",
	})
	if err != nil {
		return nil, err
	}

	for _, proposal := range proposalPage.Items {
		results = append(results, types.GlobalSearchResult{
			Type:     "proposal",
			ID:       proposal.ID,
			Title:    proposal.JobName,
			Subtitle: "Proposal",
			Meta:     fmt.Sprintf("%s | %s", proposal.Customer.Name, proposal.QuoteDate.Format("01/02/2006")),
		})
	}

	estimatePage, err := a.estimateService.GetPage(types.EstimatePageRequest{
		Page:     1,
		PageSize: 5,
		Search:   query,
		Status:   "all",
	})
	if err != nil {
		return nil, err
	}

	for _, estimate := range estimatePage.Items {
		results = append(results, types.GlobalSearchResult{
			Type:     "estimate",
			ID:       estimate.JobID,
			Title:    estimate.JobName,
			Subtitle: "Custom Cabinet",
			Meta:     fmt.Sprintf("%s | %s", estimate.Customer.Name, estimate.EstimateDate.Format("01/02/2006")),
		})
	}

	return results, nil
}

// ==================== Settings Methods ====================

func (a *App) GetCompanySettings() (*database.CompanySettings, error) {
	return a.settingsService.GetCompanySettings()
}

func (a *App) UpdateCompanySettings(req types.UpdateCompanySettingsRequest) (*database.CompanySettings, error) {
	return a.settingsService.UpdateCompanySettings(req)
}

// ==================== Tax Rate Methods ====================

func (a *App) GetAllTaxRates() ([]database.TaxRate, error) {
	return a.taxRateService.GetAll()
}

func (a *App) CreateTaxRate(req types.CreateTaxRateRequest) (*database.TaxRate, error) {
	return a.taxRateService.Create(req)
}

func (a *App) UpdateTaxRate(id uint, req types.CreateTaxRateRequest) (*database.TaxRate, error) {
	return a.taxRateService.Update(id, req)
}

func (a *App) DeleteTaxRate(id uint) error {
	return a.taxRateService.Delete(id)
}
