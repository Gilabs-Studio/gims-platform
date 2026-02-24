package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	hrdDTO "github.com/gilabs/gims/api/internal/hrd/domain/dto"
	hrdUsecase "github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	inventoryDTO "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	salesDTO "github.com/gilabs/gims/api/internal/sales/domain/dto"
	salesUsecase "github.com/gilabs/gims/api/internal/sales/domain/usecase"
)

// ActionResult holds the outcome of executing an AI-requested action
type ActionResult struct {
	Success      bool        `json:"success"`
	Data         interface{} `json:"data,omitempty"`
	Message      string      `json:"message"`
	EntityType   string      `json:"entity_type,omitempty"`
	EntityID     string      `json:"entity_id,omitempty"`
	Action       string      `json:"action"`
	DurationMs   int64       `json:"duration_ms"`
	ErrorCode    string      `json:"error_code,omitempty"`
	ErrorMessage string      `json:"error_message,omitempty"`
}

// ActionExecutorDeps holds the domain usecase dependencies for the executor
type ActionExecutorDeps struct {
	HolidayUsecase        hrdUsecase.HolidayUsecase
	LeaveRequestUsecase   hrdUsecase.LeaveRequestUsecase
	AttendanceUsecase     hrdUsecase.AttendanceRecordUsecase
	SalesQuotationUsecase salesUsecase.SalesQuotationUsecase
	SalesOrderUsecase     salesUsecase.SalesOrderUsecase
	InventoryUsecase      inventoryUsecase.InventoryUsecase
}

// ActionExecutor dispatches resolved intents to the appropriate domain usecases
type ActionExecutor struct {
	deps           *ActionExecutorDeps
	entityResolver *EntityResolver
}

// NewActionExecutor creates a new ActionExecutor
func NewActionExecutor(deps *ActionExecutorDeps, entityResolver *EntityResolver) *ActionExecutor {
	return &ActionExecutor{
		deps:           deps,
		entityResolver: entityResolver,
	}
}

// Execute dispatches the action based on intent code and parameters
func (e *ActionExecutor) Execute(ctx context.Context, intent *IntentResult, resolvedEntities map[string]*ResolvedEntity, currentUserID string) *ActionResult {
	start := time.Now()

	var result *ActionResult
	switch intent.IntentCode {
	// ==========================================
	//  HRD Module — Holidays
	// ==========================================
	case "CREATE_HOLIDAY":
		result = e.executeCreateHoliday(ctx, intent.Parameters)
	case "LIST_HOLIDAYS":
		result = e.executeListHolidays(ctx, intent.Parameters)

	// ==========================================
	//  HRD Module — Leave
	// ==========================================
	case "CREATE_LEAVE_REQUEST":
		result = e.executeCreateLeaveRequest(ctx, intent.Parameters, currentUserID)
	case "LIST_LEAVE_REQUESTS":
		result = e.executeListLeaveRequests(ctx, intent.Parameters, currentUserID)
	case "APPROVE_LEAVE_REQUEST", "REJECT_LEAVE_REQUEST":
		result = e.notImplementedResult(intent, "Leave approval/rejection via AI is coming soon. Please use the HRD module in the sidebar.")

	// ==========================================
	//  HRD Module — Attendance
	// ==========================================
	case "QUERY_ATTENDANCE":
		result = e.executeQueryAttendance(ctx, intent.Parameters, resolvedEntities)

	// ==========================================
	//  HRD Module — Employees, Contracts, etc.
	// ==========================================
	case "LIST_EMPLOYEES", "QUERY_EMPLOYEE":
		result = e.notImplementedResult(intent, "Employee query via AI is coming soon. You can browse employees in the HRD > Employees section.")
	case "LIST_CONTRACTS", "QUERY_CONTRACT", "CREATE_CONTRACT":
		result = e.notImplementedResult(intent, "Employee contract management via AI is coming soon. Please use HRD > Employee Contracts.")
	case "LIST_OVERTIME", "CREATE_OVERTIME", "APPROVE_OVERTIME":
		result = e.notImplementedResult(intent, "Overtime management via AI is coming soon. Please use HRD > Overtime.")
	case "LIST_WORK_SCHEDULES", "CREATE_WORK_SCHEDULE":
		result = e.notImplementedResult(intent, "Work schedule management via AI is coming soon. Please use HRD > Work Schedules.")
	case "LIST_RECRUITMENTS", "CREATE_RECRUITMENT":
		result = e.notImplementedResult(intent, "Recruitment management via AI is coming soon. Please use HRD > Recruitment.")
	case "LIST_EVALUATIONS":
		result = e.notImplementedResult(intent, "Evaluation query via AI is coming soon. Please use HRD > Evaluations.")
	case "LIST_CERTIFICATIONS":
		result = e.notImplementedResult(intent, "Certification query via AI is coming soon. Please use HRD > Certifications.")
	case "LIST_EDUCATION_HISTORY":
		result = e.notImplementedResult(intent, "Education history query via AI is coming soon. Please use HRD > Education History.")
	case "LIST_EMPLOYEE_ASSETS":
		result = e.notImplementedResult(intent, "Employee asset query via AI is coming soon. Please use HRD > Employee Assets.")
	case "LIST_LEAVE_TYPES":
		result = e.notImplementedResult(intent, "Leave type query via AI is coming soon. Please use HRD > Leave Types.")

	// ==========================================
	//  Sales Module
	// ==========================================
	case "CREATE_SALES_QUOTATION":
		result = e.executeCreateSalesQuotation(ctx, intent.Parameters, currentUserID, resolvedEntities)
	case "LIST_SALES_QUOTATIONS":
		result = e.executeListSalesQuotations(ctx, intent.Parameters)
	case "APPROVE_SALES_QUOTATION":
		result = e.notImplementedResult(intent, "Sales quotation approval via AI is coming soon. Please use Sales > Quotations.")
	case "CREATE_SALES_ORDER", "LIST_SALES_ORDERS", "QUERY_SALES_ORDER":
		result = e.notImplementedResult(intent, "Sales order management via AI is coming soon. Please use Sales > Orders.")
	case "LIST_DELIVERY_ORDERS", "CREATE_DELIVERY_ORDER":
		result = e.notImplementedResult(intent, "Delivery order management via AI is coming soon. Please use Sales > Delivery Orders.")
	case "LIST_SALES_INVOICES", "CREATE_SALES_INVOICE":
		result = e.notImplementedResult(intent, "Sales invoice management via AI is coming soon. Please use Sales > Invoices.")
	case "LIST_SALES_VISITS":
		result = e.notImplementedResult(intent, "Sales visit query via AI is coming soon. Please use Sales > Visits.")
	case "LIST_SALES_ESTIMATIONS":
		result = e.notImplementedResult(intent, "Sales estimation query via AI is coming soon. Please use Sales > Estimations.")
	case "LIST_SALES_TARGETS":
		result = e.notImplementedResult(intent, "Sales target query via AI is coming soon. Please use Sales > Targets.")

	// ==========================================
	//  Purchase Module
	// ==========================================
	case "LIST_PURCHASE_REQUISITIONS", "CREATE_PURCHASE_REQUISITION":
		result = e.notImplementedResult(intent, "Purchase requisition management via AI is coming soon. Please use Purchase > Requisitions.")
	case "LIST_PURCHASE_ORDERS", "CREATE_PURCHASE_ORDER", "APPROVE_PURCHASE_ORDER":
		result = e.notImplementedResult(intent, "Purchase order management via AI is coming soon. Please use Purchase > Orders.")
	case "LIST_GOODS_RECEIPTS":
		result = e.notImplementedResult(intent, "Goods receipt query via AI is coming soon. Please use Purchase > Goods Receipts.")
	case "LIST_SUPPLIER_INVOICES":
		result = e.notImplementedResult(intent, "Supplier invoice query via AI is coming soon. Please use Purchase > Supplier Invoices.")

	// ==========================================
	//  Stock / Inventory Module
	// ==========================================
	case "QUERY_STOCK", "LIST_INVENTORY":
		result = e.executeQueryStock(ctx, intent.Parameters, resolvedEntities)
	case "LIST_STOCK_MOVEMENTS":
		result = e.notImplementedResult(intent, "Stock movement query via AI is coming soon. Please use Inventory > Stock Movements.")
	case "LIST_STOCK_OPNAME", "CREATE_STOCK_OPNAME":
		result = e.notImplementedResult(intent, "Stock opname management via AI is coming soon. Please use Inventory > Stock Opname.")

	// ==========================================
	//  Finance Module
	// ==========================================
	case "LIST_COA", "QUERY_COA":
		result = e.notImplementedResult(intent, "Chart of Accounts query via AI is coming soon. Please use Finance > COA.")
	case "LIST_JOURNALS", "CREATE_JOURNAL":
		result = e.notImplementedResult(intent, "Journal entry management via AI is coming soon. Please use Finance > Journals.")
	case "LIST_BANK_ACCOUNTS":
		result = e.notImplementedResult(intent, "Bank account query via AI is coming soon. Please use Finance > Bank Accounts.")
	case "LIST_PAYMENTS":
		result = e.notImplementedResult(intent, "Payment query via AI is coming soon. Please use Finance > Payments.")
	case "LIST_TAX_INVOICES":
		result = e.notImplementedResult(intent, "Tax invoice query via AI is coming soon. Please use Finance > Tax Invoices.")
	case "LIST_BUDGETS":
		result = e.notImplementedResult(intent, "Budget query via AI is coming soon. Please use Finance > Budgets.")
	case "LIST_CASH_BANK":
		result = e.notImplementedResult(intent, "Cash & Bank query via AI is coming soon. Please use Finance > Cash & Bank.")
	case "LIST_ASSETS":
		result = e.notImplementedResult(intent, "Fixed asset query via AI is coming soon. Please use Finance > Assets.")
	case "LIST_SALARY":
		result = e.notImplementedResult(intent, "Salary query via AI is coming soon. Please use Finance > Salary.")

	// ==========================================
	//  Master Data Module
	// ==========================================
	case "LIST_SUPPLIERS", "QUERY_SUPPLIER":
		result = e.notImplementedResult(intent, "Supplier query via AI is coming soon. Please use Master Data > Suppliers.")
	case "LIST_PRODUCTS", "QUERY_PRODUCT":
		// Smart reroute: product queries about stock levels → QUERY_STOCK
		if lowStock, ok := intent.Parameters["low_stock"].(bool); ok && lowStock {
			result = e.executeQueryStock(ctx, intent.Parameters, resolvedEntities)
		} else if search := getStringParam(intent.Parameters, "search"); search != "" && isStockFilterTerm(search) {
			intent.Parameters["low_stock"] = true
			result = e.executeQueryStock(ctx, intent.Parameters, resolvedEntities)
		} else {
			result = e.notImplementedResult(intent, "Product management via AI is coming soon. Please use Master Data > Products.")
		}
	case "CREATE_PRODUCT":
		result = e.notImplementedResult(intent, "Product management via AI is coming soon. Please use Master Data > Products.")
	case "LIST_WAREHOUSES":
		result = e.notImplementedResult(intent, "Warehouse query via AI is coming soon. Please use Master Data > Warehouses.")
	case "LIST_PRODUCT_CATEGORIES":
		result = e.notImplementedResult(intent, "Product category query via AI is coming soon. Please use Master Data > Product Categories.")
	case "LIST_PRODUCT_BRANDS":
		result = e.notImplementedResult(intent, "Product brand query via AI is coming soon. Please use Master Data > Product Brands.")
	case "LIST_PAYMENT_TERMS":
		result = e.notImplementedResult(intent, "Payment term query via AI is coming soon. Please use Master Data > Payment Terms.")
	case "LIST_COURIER_AGENCIES":
		result = e.notImplementedResult(intent, "Courier agency query via AI is coming soon. Please use Master Data > Courier Agencies.")

	// ==========================================
	//  Organization Module
	// ==========================================
	case "LIST_DIVISIONS":
		result = e.notImplementedResult(intent, "Division query via AI is coming soon. Please use Organization > Divisions.")
	case "LIST_JOB_POSITIONS":
		result = e.notImplementedResult(intent, "Job position query via AI is coming soon. Please use Organization > Job Positions.")
	case "LIST_BUSINESS_UNITS":
		result = e.notImplementedResult(intent, "Business unit query via AI is coming soon. Please use Organization > Business Units.")
	case "LIST_AREAS":
		result = e.notImplementedResult(intent, "Area query via AI is coming soon. Please use Organization > Areas.")

	// ==========================================
	//  Geographic Module
	// ==========================================
	case "LIST_PROVINCES":
		result = e.notImplementedResult(intent, "Province query via AI is coming soon. Please use Geographic > Provinces.")
	case "LIST_CITIES":
		result = e.notImplementedResult(intent, "City query via AI is coming soon. Please use Geographic > Cities.")
	case "LIST_DISTRICTS":
		result = e.notImplementedResult(intent, "District query via AI is coming soon. Please use Geographic > Districts.")

	// ==========================================
	//  Reports Module
	// ==========================================
	case "GENERATE_REPORT":
		result = e.notImplementedResult(intent, "Report generation via AI is coming soon. Please use the Reports section in the sidebar.")

	// ==========================================
	//  User Management Module
	// ==========================================
	case "LIST_USERS":
		result = e.notImplementedResult(intent, "User query via AI is coming soon. Please use Settings > Users.")
	case "LIST_ROLES":
		result = e.notImplementedResult(intent, "Role query via AI is coming soon. Please use Settings > Roles.")

	// ==========================================
	//  General
	// ==========================================
	case "GENERAL_CHAT":
		result = &ActionResult{
			Success: true,
			Message: "general_chat",
			Action:  "QUERY",
		}

	default:
		result = &ActionResult{
			Success:      false,
			Message:      fmt.Sprintf("Unknown intent code: %s", intent.IntentCode),
			Action:       intent.ActionType,
			ErrorCode:    "UNKNOWN_INTENT",
			ErrorMessage: fmt.Sprintf("Intent '%s' is not recognized. Please try a different request.", intent.IntentCode),
		}
	}

	result.DurationMs = time.Since(start).Milliseconds()
	return result
}

// notImplementedResult returns a structured result for intents that are recognized but not yet wired to backend usecases
func (e *ActionExecutor) notImplementedResult(intent *IntentResult, guidance string) *ActionResult {
	return &ActionResult{
		Success:    true,
		Message:    guidance,
		Action:     intent.ActionType,
		EntityType: intent.Module,
		ErrorCode:  "NOT_IMPLEMENTED",
	}
}

// BuildActionPreview creates a human-readable preview of what will happen before execution
func (e *ActionExecutor) BuildActionPreview(intent *IntentResult, resolvedEntities map[string]*ResolvedEntity) map[string]interface{} {
	preview := map[string]interface{}{
		"intent":      intent.IntentCode,
		"action_type": intent.ActionType,
		"module":      intent.Module,
		"parameters":  intent.Parameters,
	}

	if len(resolvedEntities) > 0 {
		entities := make(map[string]string)
		for key, entity := range resolvedEntities {
			display := entity.DisplayName
			if entity.Code != "" {
				display = fmt.Sprintf("%s (%s)", entity.DisplayName, entity.Code)
			}
			entities[key] = display
		}
		preview["resolved_entities"] = entities
	}

	return preview
}

// --- HRD Action Implementations ---

func (e *ActionExecutor) executeCreateHoliday(ctx context.Context, params map[string]interface{}) *ActionResult {
	if e.deps.HolidayUsecase == nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Holiday service is not available"}
	}

	req := &hrdDTO.CreateHolidayRequest{
		Name:     getStringParam(params, "name"),
		Date:     getStringParam(params, "date"),
		Type:     getStringParam(params, "type"),
		IsActive: true,
	}

	if req.Type == "" {
		req.Type = "NATIONAL"
	}

	if desc := getStringParam(params, "description"); desc != "" {
		req.Description = desc
	}

	if isCollective, ok := params["is_collective_leave"].(bool); ok {
		req.IsCollectiveLeave = isCollective
	}
	if cutsAnnual, ok := params["cuts_annual_leave"].(bool); ok {
		req.CutsAnnualLeave = cutsAnnual
	}

	resp, err := e.deps.HolidayUsecase.Create(ctx, req)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "CREATE",
			EntityType:   "holiday",
			ErrorCode:    "CREATE_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success:    true,
		Data:       resp,
		Message:    fmt.Sprintf("Holiday '%s' created successfully on %s", req.Name, req.Date),
		EntityType: "holiday",
		EntityID:   resp.ID,
		Action:     "CREATE",
	}
}

func (e *ActionExecutor) executeListHolidays(ctx context.Context, params map[string]interface{}) *ActionResult {
	if e.deps.HolidayUsecase == nil {
		return &ActionResult{Success: false, Action: "QUERY", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Holiday service is not available"}
	}

	req := &hrdDTO.ListHolidaysRequest{
		Page:    1,
		PerPage: 20,
	}

	if year := getIntParam(params, "year"); year > 0 {
		req.Year = year
	}
	if search := getStringParam(params, "search"); search != "" {
		req.Search = search
	}
	if hType := getStringParam(params, "type"); hType != "" {
		req.Type = hType
	}

	holidays, pagination, err := e.deps.HolidayUsecase.List(ctx, req)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "QUERY",
			EntityType:   "holiday",
			ErrorCode:    "QUERY_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success: true,
		Data: map[string]interface{}{
			"holidays":   holidays,
			"pagination": pagination,
		},
		Message:    fmt.Sprintf("Found %d holidays", len(holidays)),
		EntityType: "holiday",
		Action:     "QUERY",
	}
}

func (e *ActionExecutor) executeCreateLeaveRequest(ctx context.Context, params map[string]interface{}, currentUserID string) *ActionResult {
	if e.deps.LeaveRequestUsecase == nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Leave request service is not available"}
	}

	// Convert params to JSON then unmarshal to the DTO for flexibility
	paramJSON, err := json.Marshal(params)
	if err != nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "INVALID_PARAMS", ErrorMessage: "Invalid parameters"}
	}

	var req hrdDTO.CreateLeaveRequestDTO
	if err := json.Unmarshal(paramJSON, &req); err != nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "INVALID_PARAMS", ErrorMessage: "Failed to parse leave request parameters"}
	}

	resp, err := e.deps.LeaveRequestUsecase.Create(ctx, &req, currentUserID)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "CREATE",
			EntityType:   "leave_request",
			ErrorCode:    "CREATE_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success:    true,
		Data:       resp,
		Message:    "Leave request created successfully",
		EntityType: "leave_request",
		EntityID:   resp.ID,
		Action:     "CREATE",
	}
}

func (e *ActionExecutor) executeListLeaveRequests(ctx context.Context, params map[string]interface{}, currentUserID string) *ActionResult {
	if e.deps.LeaveRequestUsecase == nil {
		return &ActionResult{Success: false, Action: "QUERY", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Leave request service is not available"}
	}

	filters := &hrdDTO.LeaveRequestListFilterDTO{
		Page:    1,
		PerPage: 20,
	}

	if status := getStringParam(params, "status"); status != "" {
		filters.Status = &status
	}

	results, total, err := e.deps.LeaveRequestUsecase.List(ctx, filters, currentUserID)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "QUERY",
			EntityType:   "leave_request",
			ErrorCode:    "QUERY_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success: true,
		Data: map[string]interface{}{
			"leave_requests": results,
			"total":          total,
		},
		Message:    fmt.Sprintf("Found %d leave requests", total),
		EntityType: "leave_request",
		Action:     "QUERY",
	}
}

func (e *ActionExecutor) executeQueryAttendance(ctx context.Context, params map[string]interface{}, resolvedEntities map[string]*ResolvedEntity) *ActionResult {
	if e.deps.AttendanceUsecase == nil {
		return &ActionResult{Success: false, Action: "QUERY", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Attendance service is not available"}
	}

	req := &hrdDTO.ListAttendanceRecordsRequest{
		Page:    1,
		PerPage: 20,
	}

	if emp, ok := resolvedEntities["employee"]; ok {
		req.EmployeeID = emp.ID
	}

	records, pagination, err := e.deps.AttendanceUsecase.List(ctx, req)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "QUERY",
			EntityType:   "attendance",
			ErrorCode:    "QUERY_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success: true,
		Data: map[string]interface{}{
			"records":    records,
			"pagination": pagination,
		},
		Message:    fmt.Sprintf("Found %d attendance records", len(records)),
		EntityType: "attendance",
		Action:     "QUERY",
	}
}

// --- Sales Action Implementations ---

func (e *ActionExecutor) executeCreateSalesQuotation(ctx context.Context, params map[string]interface{}, currentUserID string, resolvedEntities map[string]*ResolvedEntity) *ActionResult {
	if e.deps.SalesQuotationUsecase == nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Sales quotation service is not available"}
	}

	// Resolve human-readable names to database UUIDs before building the DTO.
	// The LLM extracts names (payment_terms_name, business_unit_name, items[].product_name)
	// but the DTO requires UUIDs (payment_terms_id, business_unit_id, items[].product_id).

	// Resolve payment_terms_name → payment_terms_id
	if _, hasID := params["payment_terms_id"]; !hasID {
		for _, key := range []string{"payment_terms_name", "payment_terms", "syarat_pembayaran"} {
			if name, ok := params[key].(string); ok && name != "" {
				ptID, err := e.entityResolver.ResolvePaymentTerms(ctx, name)
				if err != nil {
					return &ActionResult{Success: false, Action: "CREATE", EntityType: "sales_quotation", ErrorCode: "ENTITY_NOT_FOUND", ErrorMessage: fmt.Sprintf("Syarat pembayaran '%s' tidak ditemukan di database", name)}
				}
				params["payment_terms_id"] = ptID
				break
			}
		}
	}

	// Resolve business_unit_name → business_unit_id
	if _, hasID := params["business_unit_id"]; !hasID {
		for _, key := range []string{"business_unit_name", "business_unit", "unit_bisnis"} {
			if name, ok := params[key].(string); ok && name != "" {
				buID, err := e.entityResolver.ResolveBusinessUnit(ctx, name)
				if err != nil {
					return &ActionResult{Success: false, Action: "CREATE", EntityType: "sales_quotation", ErrorCode: "ENTITY_NOT_FOUND", ErrorMessage: fmt.Sprintf("Unit bisnis '%s' tidak ditemukan di database", name)}
				}
				params["business_unit_id"] = buID
				break
			}
		}
	}

	// Resolve items: product_name → product_id, fill default price/quantity
	if items, ok := params["items"].([]interface{}); ok {
		for i, item := range items {
			itemMap, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			// Resolve product_name → product_id if not already set
			if _, hasProductID := itemMap["product_id"]; !hasProductID {
				if pName, ok := itemMap["product_name"].(string); ok && pName != "" {
					prodID, prodPrice, err := e.entityResolver.ResolveProductByName(ctx, pName)
					if err != nil {
						return &ActionResult{Success: false, Action: "CREATE", EntityType: "sales_quotation", ErrorCode: "ENTITY_NOT_FOUND", ErrorMessage: fmt.Sprintf("Produk '%s' tidak dapat di-resolve: %s", pName, err.Error())}
					}
					itemMap["product_id"] = prodID
					// Use DB price if LLM didn't extract one or extracted 0
					if price, _ := itemMap["price"].(float64); price <= 0 && prodPrice > 0 {
						itemMap["price"] = prodPrice
					}
				}
			}
			// Default quantity to 1 if missing
			if qty, _ := itemMap["quantity"].(float64); qty <= 0 {
				itemMap["quantity"] = float64(1)
			}
			// Default discount to 0
			if _, hasDiscount := itemMap["discount"]; !hasDiscount {
				itemMap["discount"] = float64(0)
			}
			items[i] = itemMap
		}
		params["items"] = items
	}

	// Ensure quotation_date is today (prevent LLM hallucination of past dates)
	today := time.Now().Format("2006-01-02")
	if qd, ok := params["quotation_date"].(string); !ok || qd == "" {
		params["quotation_date"] = today
	} else {
		// Validate the date is reasonable — override if year is in the past
		if parsed, err := time.Parse("2006-01-02", qd); err != nil || parsed.Year() < time.Now().Year() {
			params["quotation_date"] = today
		}
	}

	// Auto-fill sales_rep_id: resolve current user ID → employee ID
	// The FK points to employees.id, not users.id
	if _, hasSR := params["sales_rep_id"]; !hasSR || getStringParam(params, "sales_rep_id") == "" {
		empID, err := e.entityResolver.ResolveUserToEmployeeID(ctx, currentUserID)
		if err != nil {
			return &ActionResult{Success: false, Action: "CREATE", EntityType: "sales_quotation", ErrorCode: "ENTITY_NOT_FOUND", ErrorMessage: "Tidak dapat menemukan data karyawan untuk user saat ini. Pastikan akun Anda terhubung dengan data karyawan."}
		}
		params["sales_rep_id"] = empID
	}

	// Apply resolved customer name from entity resolution
	if customer, ok := resolvedEntities["customer"]; ok && getStringParam(params, "customer_name") == "" {
		params["customer_name"] = customer.DisplayName
	}

	// Strip extra LLM-generated fields that don't belong to the DTO
	// to prevent JSON unmarshal issues
	allowedFields := map[string]bool{
		"quotation_date": true, "valid_until": true, "payment_terms_id": true,
		"sales_rep_id": true, "business_unit_id": true, "business_type_id": true,
		"customer_name": true, "customer_contact": true, "customer_phone": true,
		"customer_email": true, "tax_rate": true, "delivery_cost": true,
		"other_cost": true, "discount_amount": true, "notes": true, "items": true,
	}
	cleanParams := make(map[string]interface{})
	for k, v := range params {
		if allowedFields[k] {
			cleanParams[k] = v
		}
	}

	// Convert cleaned params to JSON then unmarshal to DTO
	paramJSON, err := json.Marshal(cleanParams)
	if err != nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "INVALID_PARAMS", ErrorMessage: "Invalid parameters"}
	}

	var req salesDTO.CreateSalesQuotationRequest
	if err := json.Unmarshal(paramJSON, &req); err != nil {
		return &ActionResult{Success: false, Action: "CREATE", ErrorCode: "INVALID_PARAMS", ErrorMessage: fmt.Sprintf("Failed to parse sales quotation parameters: %s", err.Error())}
	}

	resp, err := e.deps.SalesQuotationUsecase.Create(ctx, &req, &currentUserID)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "CREATE",
			EntityType:   "sales_quotation",
			ErrorCode:    "CREATE_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success:    true,
		Data:       resp,
		Message:    fmt.Sprintf("Sales quotation created for %s", req.CustomerName),
		EntityType: "sales_quotation",
		EntityID:   resp.ID,
		Action:     "CREATE",
	}
}

func (e *ActionExecutor) executeListSalesQuotations(ctx context.Context, params map[string]interface{}) *ActionResult {
	if e.deps.SalesQuotationUsecase == nil {
		return &ActionResult{Success: false, Action: "QUERY", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Sales quotation service is not available"}
	}

	req := &salesDTO.ListSalesQuotationsRequest{
		Page:    1,
		PerPage: 20,
	}

	if search := getStringParam(params, "search"); search != "" {
		req.Search = search
	}
	if status := getStringParam(params, "status"); status != "" {
		req.Status = status
	}
	if period := getStringParam(params, "period"); period != "" {
		now := time.Now()
		switch period {
		case "current_month":
			req.DateFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
			req.DateTo = now.Format("2006-01-02")
		case "last_month":
			lastMonth := now.AddDate(0, -1, 0)
			req.DateFrom = time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
			req.DateTo = time.Date(now.Year(), now.Month(), 0, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		case "current_year":
			req.DateFrom = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
			req.DateTo = now.Format("2006-01-02")
		}
	}

	quotations, pagination, err := e.deps.SalesQuotationUsecase.List(ctx, req)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "QUERY",
			EntityType:   "sales_quotation",
			ErrorCode:    "QUERY_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	return &ActionResult{
		Success: true,
		Data: map[string]interface{}{
			"quotations": quotations,
			"pagination": pagination,
		},
		Message:    fmt.Sprintf("Found %d sales quotations", len(quotations)),
		EntityType: "sales_quotation",
		Action:     "QUERY",
	}
}

// stockFilterKeywords maps natural language stock-level terms to the low_stock filter.
// These terms should NOT be used as product name search.
var stockFilterKeywords = []string{
	"kurang", "rendah", "low", "minimum", "habis", "kosong", "out of stock",
	"menipis", "sedikit", "dikit", "kritis", "hampir habis", "empty", "shortage",
	"minim", "tipis", "critical",
}

// isStockFilterTerm checks if a search term is a stock-level filter word, not a product name
func isStockFilterTerm(term string) bool {
	lower := strings.TrimSpace(strings.ToLower(term))
	for _, kw := range stockFilterKeywords {
		if lower == kw || strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

// --- Inventory Action Implementations ---

func (e *ActionExecutor) executeQueryStock(ctx context.Context, params map[string]interface{}, resolvedEntities map[string]*ResolvedEntity) *ActionResult {
	if e.deps.InventoryUsecase == nil {
		return &ActionResult{Success: false, Action: "QUERY", ErrorCode: "SERVICE_UNAVAILABLE", ErrorMessage: "Inventory service is not available"}
	}

	req := &inventoryDTO.GetInventoryListRequest{
		Page:    1,
		PerPage: 20,
	}

	if product, ok := resolvedEntities["product"]; ok {
		req.ProductID = product.ID
	}
	if warehouse, ok := resolvedEntities["warehouse"]; ok {
		req.WarehouseID = warehouse.ID
	}

	// Handle search parameter — only use it if it's an actual product name, not a filter word
	if search := getStringParam(params, "search"); search != "" {
		if isStockFilterTerm(search) {
			req.LowStock = true
		} else {
			req.Search = search
		}
	}

	// Explicit low_stock flag from parameter extraction
	if lowStock, ok := params["low_stock"].(bool); ok && lowStock {
		req.LowStock = true
	}

	// Detect stock-level keywords in filter/status params
	if filter := getStringParam(params, "filter"); filter != "" && isStockFilterTerm(filter) {
		req.LowStock = true
	}
	if status := getStringParam(params, "status"); status != "" && isStockFilterTerm(status) {
		req.LowStock = true
	}

	resp, err := e.deps.InventoryUsecase.GetStockList(ctx, req)
	if err != nil {
		return &ActionResult{
			Success:      false,
			Action:       "QUERY",
			EntityType:   "inventory",
			ErrorCode:    "QUERY_FAILED",
			ErrorMessage: err.Error(),
		}
	}

	// Post-query filtering: if LowStock requested, filter items by status
	if req.LowStock && resp != nil && len(resp.Data) > 0 {
		var filtered []inventoryDTO.InventoryStockItem
		for _, item := range resp.Data {
			if item.Status == "low_stock" || item.Status == "out_of_stock" {
				filtered = append(filtered, item)
			}
		}
		resp.Data = filtered
		resp.Meta.Total = int64(len(filtered))
	}

	// Build a concise summary for the LLM to avoid confusion with large JSON
	summary := e.buildStockSummary(resp)

	return &ActionResult{
		Success:    true,
		Data:       summary,
		Message:    fmt.Sprintf("Found %d stock items", len(resp.Data)),
		EntityType: "inventory",
		Action:     "QUERY",
	}
}

// buildStockSummary creates a structured, LLM-friendly summary of stock data
func (e *ActionExecutor) buildStockSummary(resp *inventoryDTO.GetInventoryListResponse) map[string]interface{} {
	if resp == nil || len(resp.Data) == 0 {
		return map[string]interface{}{
			"total_items": 0,
			"items":       []interface{}{},
			"message":     "Tidak ada data stok ditemukan",
		}
	}

	items := make([]map[string]interface{}, 0, len(resp.Data))
	for _, item := range resp.Data {
		items = append(items, map[string]interface{}{
			"product_name":  item.ProductName,
			"product_code":  item.ProductCode,
			"warehouse":     item.WarehouseName,
			"available":     item.Available,
			"on_hand":       item.OnHand,
			"reserved":      item.Reserved,
			"min_stock":     item.MinStock,
			"max_stock":     item.MaxStock,
			"unit":          item.UomName,
			"status":        item.Status,
		})
	}

	return map[string]interface{}{
		"total_items": len(resp.Data),
		"page":        resp.Meta.Page,
		"per_page":    resp.Meta.PerPage,
		"items":       items,
	}
}

// --- Helper functions for parameter extraction ---

func getStringParam(params map[string]interface{}, key string) string {
	if val, ok := params[key].(string); ok {
		return val
	}
	return ""
}

func getIntParam(params map[string]interface{}, key string) int {
	if val, ok := params[key].(float64); ok {
		return int(val)
	}
	if val, ok := params[key].(int); ok {
		return val
	}
	return 0
}
