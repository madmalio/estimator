package services

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jung-kurt/gofpdf"
)

type PDFService struct {
	estimateService *EstimateService
}

func NewPDFService() *PDFService {
	return &PDFService{
		estimateService: NewEstimateService(),
	}
}

// Company info - edit these values as needed
const (
	companyName    = "Your Company Name"
	companyAddress = "123 Main Street"
	companyCity    = "City, State 12345"
	companyPhone   = "(555) 123-4567"
	companyEmail   = "info@yourcompany.com"
)

func (s *PDFService) GenerateEstimatePDF(jobID uint) (string, error) {
	// Get the estimate with all related data
	job, err := s.estimateService.GetByID(jobID)
	if err != nil {
		return "", err
	}

	// Create PDF
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Company Header
	pdf.SetFont("Arial", "B", 18)
	pdf.Cell(0, 10, companyName)
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 5, companyAddress)
	pdf.Ln(5)
	pdf.Cell(0, 5, companyCity)
	pdf.Ln(5)
	pdf.Cell(0, 5, fmt.Sprintf("Phone: %s | Email: %s", companyPhone, companyEmail))
	pdf.Ln(12)

	// Estimate Title
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 8, "ESTIMATE")
	pdf.Ln(10)

	// Customer Info and Job Details side by side
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(90, 6, "Customer Information")
	pdf.Cell(90, 6, "Estimate Details")
	pdf.Ln(6)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(90, 5, job.Customer.Name)
	pdf.Cell(90, 5, fmt.Sprintf("Job: %s", job.JobName))
	pdf.Ln(5)

	if job.Customer.Address != "" {
		pdf.Cell(90, 5, job.Customer.Address)
	} else {
		pdf.Cell(90, 5, "")
	}
	pdf.Cell(90, 5, fmt.Sprintf("Date: %s", job.EstimateDate.Format("January 2, 2006")))
	pdf.Ln(5)

	if job.Customer.Phone != "" {
		pdf.Cell(90, 5, fmt.Sprintf("Phone: %s", job.Customer.Phone))
	} else {
		pdf.Cell(90, 5, "")
	}
	pdf.Cell(90, 5, fmt.Sprintf("Estimate #: %d", job.JobID))
	pdf.Ln(5)

	if job.Customer.Email != "" {
		pdf.Cell(90, 5, fmt.Sprintf("Email: %s", job.Customer.Email))
	}
	pdf.Ln(12)

	// Line Items Table Header
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Arial", "B", 10)

	colWidths := []float64{80, 30, 35, 35}
	headers := []string{"Description", "Quantity", "Unit Price", "Total"}

	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(8)

	// Line Items
	pdf.SetFont("Arial", "", 10)
	var subtotal float64

	for _, item := range job.LineItems {
		// Description (left-aligned)
		displayName := item.ItemName
		if item.CategoryName != "" {
			displayName = fmt.Sprintf("%s - %s", item.CategoryName, item.ItemName)
		}
		pdf.CellFormat(colWidths[0], 7, truncateText(pdf, displayName, colWidths[0]-2), "1", 0, "L", false, 0, "")

		// Quantity (center-aligned)
		pdf.CellFormat(colWidths[1], 7, fmt.Sprintf("%.2f", item.Quantity), "1", 0, "C", false, 0, "")

		// Unit Price (right-aligned)
		pdf.CellFormat(colWidths[2], 7, fmt.Sprintf("$%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")

		// Line Total (right-aligned)
		pdf.CellFormat(colWidths[3], 7, fmt.Sprintf("$%.2f", item.LineTotal), "1", 0, "R", false, 0, "")
		pdf.Ln(7)

		subtotal += item.LineTotal
	}

	pdf.Ln(5)

	// Totals Section
	totalsX := 115.0
	labelWidth := 45.0
	valueWidth := 35.0

	// Subtotal
	pdf.SetX(totalsX)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(labelWidth, 6, "Subtotal:")
	pdf.Cell(valueWidth, 6, fmt.Sprintf("$%.2f", subtotal))
	pdf.Ln(6)

	// Markup
	if job.MarkupPercent > 0 {
		markupAmount := subtotal * (job.MarkupPercent / 100)
		pdf.SetX(totalsX)
		pdf.Cell(labelWidth, 6, fmt.Sprintf("Markup (%.1f%%):", job.MarkupPercent))
		pdf.Cell(valueWidth, 6, fmt.Sprintf("$%.2f", markupAmount))
		pdf.Ln(6)
	}

	// Installation
	if job.InstallTotal > 0 {
		pdf.SetX(totalsX)
		pdf.Cell(labelWidth, 6, "Installation:")
		pdf.Cell(valueWidth, 6, fmt.Sprintf("$%.2f", job.InstallTotal))
		pdf.Ln(6)
	}

	// Misc Charge
	if job.MiscCharge > 0 {
		pdf.SetX(totalsX)
		pdf.Cell(labelWidth, 6, "Misc. Charges:")
		pdf.Cell(valueWidth, 6, fmt.Sprintf("$%.2f", job.MiscCharge))
		pdf.Ln(6)
	}

	// Grand Total
	pdf.SetX(totalsX)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(labelWidth, 8, "TOTAL:")
	pdf.Cell(valueWidth, 8, fmt.Sprintf("$%.2f", job.TotalAmount))
	pdf.Ln(15)

	// Footer Notes
	pdf.SetFont("Arial", "I", 9)
	pdf.MultiCell(0, 5, "This estimate is valid for 30 days from the date above. Prices are subject to change based on material availability and scope modifications.", "", "L", false)

	// Save to a user-visible folder when possible
	outputDir := os.TempDir()
	if homeDir, homeErr := os.UserHomeDir(); homeErr == nil {
		documentsDir := filepath.Join(homeDir, "Documents", "CabinetEstimator")
		if mkdirErr := os.MkdirAll(documentsDir, 0o755); mkdirErr == nil {
			outputDir = documentsDir
		}
	}

	timestamp := time.Now().Format("20060102-150405")
	filename := fmt.Sprintf("Estimate_%d_%s.pdf", job.JobID, timestamp)
	filePath := filepath.Join(outputDir, filename)

	err = pdf.OutputFileAndClose(filePath)
	if err != nil {
		return "", err
	}

	return filePath, nil
}

// truncateText truncates text to fit within a given width
func truncateText(pdf *gofpdf.Fpdf, text string, maxWidth float64) string {
	if pdf.GetStringWidth(text) <= maxWidth {
		return text
	}

	for len(text) > 0 {
		text = text[:len(text)-1]
		if pdf.GetStringWidth(text+"...") <= maxWidth {
			return text + "..."
		}
	}
	return "..."
}
