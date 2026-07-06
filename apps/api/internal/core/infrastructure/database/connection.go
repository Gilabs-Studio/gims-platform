package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes database connection
func Connect() error {
	dsn := config.GetDSN()

	// Default to logger.Warn to keep terminal output clean like Gin framework (no verbose SQL queries)
	logLevel := logger.Warn

	// Allow overriding via environment variables
	if dbLogLevelEnv := os.Getenv("DB_LOG_LEVEL"); dbLogLevelEnv != "" {
		switch strings.ToLower(dbLogLevelEnv) {
		case "info", "debug":
			logLevel = logger.Info
		case "silent":
			logLevel = logger.Silent
		case "error":
			logLevel = logger.Error
		case "warn":
			logLevel = logger.Warn
		}
	} else if os.Getenv("DB_DEBUG") == "true" {
		logLevel = logger.Info
	}

	// Slow query logging: logs any query taking > 100ms
	slowThreshold := 100 * time.Millisecond
	gormLogger := logger.New(
		log.New(log.Writer(), "\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             slowThreshold,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	var err error
	gormCfg := &gorm.Config{
		Logger:                                   gormLogger,
		PrepareStmt:                              config.AppConfig != nil && config.AppConfig.Database.PrepareStmt,
		SkipDefaultTransaction:                   config.AppConfig != nil && config.AppConfig.Database.SkipDefaultTransaction,
		DisableForeignKeyConstraintWhenMigrating: true,
	}

	DB, err = gorm.Open(postgres.Open(dsn), gormCfg)

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Enterprise Connection Pool Settings (env-configurable)
	maxOpen := 50
	maxIdle := 25
	maxLifetime := 30 * time.Minute
	maxIdleTime := 10 * time.Minute
	if config.AppConfig != nil {
		if config.AppConfig.Database.MaxOpenConns > 0 {
			maxOpen = config.AppConfig.Database.MaxOpenConns
		}
		if config.AppConfig.Database.MaxIdleConns >= 0 {
			maxIdle = config.AppConfig.Database.MaxIdleConns
		}
		if config.AppConfig.Database.ConnMaxLifetimeMinutes > 0 {
			maxLifetime = time.Duration(config.AppConfig.Database.ConnMaxLifetimeMinutes) * time.Minute
		}
		if config.AppConfig.Database.ConnMaxIdleTimeMinutes > 0 {
			maxIdleTime = time.Duration(config.AppConfig.Database.ConnMaxIdleTimeMinutes) * time.Minute
		}
	}

	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(maxIdle)
	sqlDB.SetConnMaxLifetime(maxLifetime)
	sqlDB.SetConnMaxIdleTime(maxIdleTime)

	log.Println("Database connected successfully with connection pool configured")
	return nil
}

// Close closes database connection
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
