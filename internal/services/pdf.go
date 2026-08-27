package services

import (
	"cabinet-estimator/internal/database"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"gorm.io/gorm"
)

type PDFService struct {
	db                   *gorm.DB
	estimateService      *EstimateService
	manualQuoteService   *ManualQuoteService
	invoiceService       *InvoiceService
}

func NewPDFService() *PDFService {
	return &PDFService{
		db:                   database.GetDB(),
		estimateService:      NewEstimateService(),
		manualQuoteService:   NewManualQuoteService(),
		invoiceService:       NewInvoiceService(),
	}
}

func documentsBaseDir(section string, createdAt time.Time) (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	yearFolder := createdAt.Format("2006")
	monthFolder := createdAt.Format("January")
	baseDir := filepath.Join(homeDir, "Documents", "CabCon", section, yearFolder, monthFolder)

	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return "", err
	}

	return baseDir, nil
}

func sanitizeFilePart(value string) string {
	replacer := strings.NewReplacer(
		"<", "",
		">", "",
		":", "",
		"\"", "",
		"/", "-",
		"\\", "-",
		"|", "",
		"?", "",
		"*", "",
	)
	sanitized := strings.TrimSpace(replacer.Replace(value))
	if sanitized == "" {
		return "Untitled"
	}
	return sanitized
}

func nextAvailablePDFPath(filePath string) string {
	if _, err := os.Stat(filePath); errors.Is(err, os.ErrNotExist) {
		return filePath
	}

	dir := filepath.Dir(filePath)
	fileName := filepath.Base(filePath)
	ext := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, ext)

	for index := 2; ; index++ {
		candidate := filepath.Join(dir, fmt.Sprintf("%s (%d)%s", base, index, ext))
		if _, err := os.Stat(candidate); errors.Is(err, os.ErrNotExist) {
			return candidate
		}
	}
}

func (s *PDFService) resolveChromiumPath() (string, error) {
	if customPath := strings.TrimSpace(os.Getenv("CABCON_CHROMIUM_PATH")); customPath != "" {
		if _, err := os.Stat(customPath); err == nil {
			return customPath, nil
		}
	}

	exePath, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exePath)
		candidates := []string{
			filepath.Join(exeDir, "chromium", "chrome.exe"),
			filepath.Join(exeDir, "resources", "chromium", "chrome.exe"),
			filepath.Join(exeDir, "chrome-win", "chrome.exe"),
			filepath.Join(exeDir, "chromium", "msedge.exe"),
			filepath.Join(exeDir, "resources", "chromium", "msedge.exe"),
		}
		for _, candidate := range candidates {
			if _, statErr := os.Stat(candidate); statErr == nil {
				return candidate, nil
			}
		}
	}

	globalCandidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
	}
	for _, candidate := range globalCandidates {
		if candidate == "" {
			continue
		}
		if _, statErr := os.Stat(candidate); statErr == nil {
			return candidate, nil
		}
	}

	if path, lookErr := exec.LookPath("chrome.exe"); lookErr == nil {
		return path, nil
	}
	if path, lookErr := exec.LookPath("msedge.exe"); lookErr == nil {
		return path, nil
	}

	return "", errors.New("no Chromium browser found; set CABCON_CHROMIUM_PATH or bundle chromium/chrome.exe with the app")
}

func (s *PDFService) renderHTMLToPDF(html string, filePath string) error {
	chromePath, err := s.resolveChromiumPath()
	if err != nil {
		return err
	}

	allocatorOpts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.ExecPath(chromePath),
		chromedp.NoDefaultBrowserCheck,
		chromedp.NoFirstRun,
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("allow-file-access-from-files", true),
	)

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), allocatorOpts...)
	defer cancelAlloc()

	ctx, cancelCtx := chromedp.NewContext(allocCtx)
	defer cancelCtx()

	ctx, cancelTimeout := context.WithTimeout(ctx, 40*time.Second)
	defer cancelTimeout()

	var pdfBytes []byte
	if err := chromedp.Run(ctx,
		chromedp.Navigate("about:blank"),
		chromedp.ActionFunc(func(ctx context.Context) error {
			return emulation.SetEmulatedMedia().WithMedia("print").Do(ctx)
		}),
		chromedp.ActionFunc(func(ctx context.Context) error {
			frameTree, frameErr := page.GetFrameTree().Do(ctx)
			if frameErr != nil {
				return frameErr
			}
			return page.SetDocumentContent(frameTree.Frame.ID, html).Do(ctx)
		}),
		chromedp.Sleep(300*time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			data, _, printErr := page.PrintToPDF().
				WithPrintBackground(true).
				WithPreferCSSPageSize(true).
				WithPaperWidth(8.5).
				WithPaperHeight(11.0).
				WithMarginTop(0).
				WithMarginRight(0).
				WithMarginBottom(0).
				WithMarginLeft(0).
				Do(ctx)
			if printErr != nil {
				return printErr
			}
			pdfBytes = data
			return nil
		}),
	); err != nil {
		return err
	}

	if err := os.WriteFile(filePath, pdfBytes, 0o644); err != nil {
		return err
	}

	return nil
}

func (s *PDFService) GenerateEstimatePDF(jobID uint, html string) (string, error) {
	job, err := s.estimateService.GetByID(jobID)
	if err != nil {
		return "", err
	}

	customerName := "Unknown"
	if job.Customer.Name != "" {
		customerName = job.Customer.Name
	}

	outputDir, err := documentsBaseDir("Custom Cabinets", job.EstimateDate)
	if err != nil {
		return "", err
	}

	revision := job.PdfRevision + 1
	filename := fmt.Sprintf(
		"Estimate_%s_%s_%s_%s_Rev%d.pdf",
		fmt.Sprintf("E-%04d", job.JobID),
		job.EstimateDate.Format("01-02-2006"),
		sanitizeFilePart(customerName),
		sanitizeFilePart(job.JobName),
		revision,
	)
	filePath := nextAvailablePDFPath(filepath.Join(outputDir, filename))

	if err := s.renderHTMLToPDF(html, filePath); err != nil {
		return "", err
	}

	if err := s.db.Model(&database.EstimateJob{}).
		Where("job_id = ?", job.JobID).
		Update("pdf_revision", revision).Error; err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *PDFService) GenerateManualQuotePDF(quoteID uint, html string) (string, error) {
	quote, err := s.manualQuoteService.GetByID(quoteID)
	if err != nil {
		return "", err
	}

	customerName := "Unknown"
	if quote.Customer != nil && quote.Customer.Name != "" {
		customerName = quote.Customer.Name
	}

	outputDir, err := documentsBaseDir("Proposals", quote.QuoteDate)
	if err != nil {
		return "", err
	}

	quoteNumber := quote.QuoteNumber
	if quoteNumber == "" {
		quoteNumber = fmt.Sprintf("P-%04d", quote.ID)
	}

	revision := quote.PdfRevision + 1
	filename := fmt.Sprintf(
		"Proposal_%s_%s_%s_%s_Rev%d.pdf",
		quoteNumber,
		quote.QuoteDate.Format("01-02-2006"),
		sanitizeFilePart(customerName),
		sanitizeFilePart(quote.JobName),
		revision,
	)
	filePath := nextAvailablePDFPath(filepath.Join(outputDir, filename))

	if err := s.renderHTMLToPDF(html, filePath); err != nil {
		return "", err
	}

	if err := s.db.Model(&database.ManualQuote{}).
		Where("id = ?", quote.ID).
		Update("pdf_revision", revision).Error; err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *PDFService) GenerateInvoicePDF(invoiceID uint, html string) (string, error) {
	invoice, err := s.invoiceService.GetByID(invoiceID)
	if err != nil {
		return "", err
	}

	customerName := "Unknown"
	if invoice.Customer != nil && invoice.Customer.Name != "" {
		customerName = invoice.Customer.Name
	}

	outputDir, err := documentsBaseDir("Invoices", invoice.InvoiceDate)
	if err != nil {
		return "", err
	}

	invoiceNumber := invoice.InvoiceNumber
	if invoiceNumber == "" {
		invoiceNumber = fmt.Sprintf("INV-%04d", invoice.ID)
	}

	revision := invoice.PdfRevision + 1
	filename := fmt.Sprintf(
		"Invoice_%s_%s_%s_%s_Rev%d.pdf",
		invoiceNumber,
		invoice.InvoiceDate.Format("01-02-2006"),
		sanitizeFilePart(customerName),
		sanitizeFilePart(invoice.JobName),
		revision,
	)
	filePath := nextAvailablePDFPath(filepath.Join(outputDir, filename))

	if err := s.renderHTMLToPDF(html, filePath); err != nil {
		return "", err
	}

	if err := s.db.Model(&database.Invoice{}).
		Where("id = ?", invoice.ID).
		Update("pdf_revision", revision).Error; err != nil {
		return "", err
	}

	return filePath, nil
}
