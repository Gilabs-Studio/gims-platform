package seeders

import (
	"fmt"
	"reflect"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"gorm.io/gorm"
)

const seederTenantIDCallbackName = "seeders:default-tenant-id"

// ensureSeederTenantIDGuard registers a Create callback that injects
// DefaultTenantID for seed structs that have an empty TenantID field.
// This keeps seed data compatible after tenant_id UUID columns became mandatory.
func ensureSeederTenantIDGuard() error {
	if database.DB == nil {
		return fmt.Errorf("database is not initialized")
	}

	createCB := database.DB.Callback().Create()
	if createCB.Get(seederTenantIDCallbackName) != nil {
		return nil
	}

	return createCB.Before("gorm:create").Register(seederTenantIDCallbackName, func(tx *gorm.DB) {
		assignTenantID(tx.Statement.ReflectValue)
	})
}

func assignTenantID(value reflect.Value) {
	if !value.IsValid() {
		return
	}

	for value.Kind() == reflect.Interface || value.Kind() == reflect.Ptr {
		if value.IsNil() {
			return
		}
		value = value.Elem()
	}

	switch value.Kind() {
	case reflect.Slice, reflect.Array:
		for i := 0; i < value.Len(); i++ {
			assignTenantID(value.Index(i))
		}
	case reflect.Struct:
		field := value.FieldByName("TenantID")
		if field.IsValid() && field.CanSet() && field.Kind() == reflect.String && field.String() == "" {
			field.SetString(DefaultTenantID)
		}
	}
}