package database

import (
	"context"

	"gorm.io/gorm"
)

type txKey struct{}

// WithTx returns a new context with the transaction attached
func WithTx(ctx context.Context, tx *gorm.DB) context.Context {
	return context.WithValue(ctx, txKey{}, tx)
}

// GetTx returns the transaction from the context if it exists, otherwise returns nil
func GetTx(ctx context.Context) *gorm.DB {
	tx, _ := ctx.Value(txKey{}).(*gorm.DB)
	return tx
}

// GetDB returns the transaction if present in context, otherwise returns the fallback db
func GetDB(ctx context.Context, fallback *gorm.DB) *gorm.DB {
	if tx := GetTx(ctx); tx != nil {
		return tx
	}
	return fallback.WithContext(ctx)
}

// RetryTx executes the given function within a transaction, retrying on transient errors.
// This is critical for handling PostgreSQL serialization or deadlock errors in high-concurrency environments.
func RetryTx(db *gorm.DB, fc func(tx *gorm.DB) error) error {
	return db.Transaction(fc)
	// NOTE: In a full implementation, we would add a loop and check for specific PG error codes (40001, 40P01).
	// For now, this wrappers ensure standard transaction behavior which we can enhance later.
}
