package database

import (
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
	appDir := filepath.Join(homeDir, ".cabinet-estimator")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, err
	}

	dbPath := filepath.Join(appDir, "cabinet_estimator.db")

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
	)
	if err != nil {
		return nil, err
	}

	return database, nil
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
