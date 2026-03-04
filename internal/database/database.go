package database

import (
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db   *gorm.DB
	once sync.Once
)

func GetDB() *gorm.DB {
	once.Do(func() {
		var err error
		db, err = initDB()
		if err != nil {
			panic(err)
		}
	})
	return db
}

func initDB() (*gorm.DB, error) {
	// Get user's home directory for storing the database
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	// Create app data directory
	appDir := filepath.Join(homeDir, ".cabcon")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, err
	}

	dbPath := filepath.Join(appDir, "cabcon.db")

	if err := migrateLegacyDB(homeDir, dbPath); err != nil {
		return nil, err
	}

	database, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	// Auto-migrate all models
	err = database.AutoMigrate(
		&Customer{},
		&Category{},
		&PriceListItem{},
		&EstimateJob{},
		&EstimateLineItem{},
		&CompanySettings{},
		&ManualQuote{},
		&ManualQuoteLineItem{},
		&TaxRate{},
	)
	if err != nil {
		return nil, err
	}

	return database, nil
}

func migrateLegacyDB(homeDir, newDBPath string) error {
	if _, err := os.Stat(newDBPath); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}

	legacyDir := filepath.Join(homeDir, ".cabinet-estimator")
	legacyDBPath := filepath.Join(legacyDir, "cabinet_estimator.db")

	if _, err := os.Stat(legacyDBPath); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}

	if err := copyFile(legacyDBPath, newDBPath); err != nil {
		return err
	}

	_ = copyFile(legacyDBPath+"-wal", newDBPath+"-wal")
	_ = copyFile(legacyDBPath+"-shm", newDBPath+"-shm")

	return nil
}

func copyFile(sourcePath, destPath string) error {
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(destPath)
	if err != nil {
		return err
	}

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		_ = destFile.Close()
		return err
	}

	if err := destFile.Close(); err != nil {
		return err
	}

	return nil
}

func CloseDB() error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
