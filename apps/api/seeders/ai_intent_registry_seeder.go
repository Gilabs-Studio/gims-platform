package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/ai/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"gorm.io/gorm/clause"
)

// Fixed UUIDs for AI intent registry — hex-only prefixes (a1 = AI intents)
const (
	// --- HRD Module ---
	IntentCreateHolidayID      = "a1000001-0000-0000-0000-000000000001"
	IntentListHolidaysID       = "a1000001-0000-0000-0000-000000000002"
	IntentCreateLeaveRequestID = "a1000001-0000-0000-0000-000000000003"
	IntentListLeaveRequestsID  = "a1000001-0000-0000-0000-000000000004"
	IntentQueryAttendanceID    = "a1000001-0000-0000-0000-000000000005"
	IntentCreateSalesQuotID    = "a1000001-0000-0000-0000-000000000006"
	IntentListSalesQuotID      = "a1000001-0000-0000-0000-000000000007"
	IntentQueryStockID         = "a1000001-0000-0000-0000-000000000008"
	IntentListInventoryID      = "a1000001-0000-0000-0000-000000000009"
	IntentGeneralChatID        = "a1000001-0000-0000-0000-00000000000a"

	// HRD expanded
	IntentListEmployeesID          = "a1000002-0000-0000-0000-000000000001"
	IntentQueryEmployeeID          = "a1000002-0000-0000-0000-000000000002"
	IntentListContractsID          = "a1000002-0000-0000-0000-000000000003"
	IntentQueryContractID          = "a1000002-0000-0000-0000-000000000004"
	IntentCreateContractID         = "a1000002-0000-0000-0000-000000000005"
	IntentApproveLeaveID           = "a1000002-0000-0000-0000-000000000006"
	IntentRejectLeaveID            = "a1000002-0000-0000-0000-000000000007"
	IntentListOvertimeID           = "a1000002-0000-0000-0000-000000000008"
	IntentCreateOvertimeID         = "a1000002-0000-0000-0000-000000000009"
	IntentApproveOvertimeID        = "a1000002-0000-0000-0000-00000000000a"
	IntentListWorkScheduleID       = "a1000002-0000-0000-0000-00000000000b"
	IntentCreateWorkScheduleID     = "a1000002-0000-0000-0000-00000000000c"
	IntentListRecruitmentID        = "a1000002-0000-0000-0000-00000000000d"
	IntentCreateRecruitmentID      = "a1000002-0000-0000-0000-00000000000e"
	IntentListEvaluationID         = "a1000002-0000-0000-0000-00000000000f"
	IntentListCertificationID      = "a1000002-0000-0000-0000-000000000010"
	IntentListEducationID          = "a1000002-0000-0000-0000-000000000011"
	IntentListEmployeeAssetID      = "a1000002-0000-0000-0000-000000000012"
	IntentListLeaveTypesID         = "a1000002-0000-0000-0000-000000000013"

	// --- Sales Module ---
	IntentCreateSalesOrderID       = "a1000003-0000-0000-0000-000000000001"
	IntentListSalesOrdersID        = "a1000003-0000-0000-0000-000000000002"
	IntentQuerySalesOrderID        = "a1000003-0000-0000-0000-000000000003"
	IntentApproveSalesQuotID       = "a1000003-0000-0000-0000-000000000004"
	IntentListDeliveryOrdersID     = "a1000003-0000-0000-0000-000000000005"
	IntentCreateDeliveryOrderID    = "a1000003-0000-0000-0000-000000000006"
	IntentListSalesInvoicesID      = "a1000003-0000-0000-0000-000000000007"
	IntentCreateSalesInvoiceID     = "a1000003-0000-0000-0000-000000000008"
	IntentListSalesVisitsID        = "a1000003-0000-0000-0000-000000000009"
	IntentListSalesEstimationsID   = "a1000003-0000-0000-0000-00000000000a"
	IntentListSalesTargetsID       = "a1000003-0000-0000-0000-00000000000b"

	// --- Purchase Module ---
	IntentListPurchaseRequisitionsID = "a1000004-0000-0000-0000-000000000001"
	IntentCreatePurchaseRequisitionID = "a1000004-0000-0000-0000-000000000002"
	IntentListPurchaseOrdersID       = "a1000004-0000-0000-0000-000000000003"
	IntentCreatePurchaseOrderID      = "a1000004-0000-0000-0000-000000000004"
	IntentListGoodsReceiptID         = "a1000004-0000-0000-0000-000000000005"
	IntentListSupplierInvoicesID     = "a1000004-0000-0000-0000-000000000006"
	IntentApprovePurchaseOrderID     = "a1000004-0000-0000-0000-000000000007"

	// --- Stock / Inventory Module ---
	IntentListStockMovementsID    = "a1000005-0000-0000-0000-000000000001"
	IntentListStockOpnameID       = "a1000005-0000-0000-0000-000000000002"
	IntentCreateStockOpnameID     = "a1000005-0000-0000-0000-000000000003"

	// --- Finance Module ---
	IntentListCOAID               = "a1000006-0000-0000-0000-000000000001"
	IntentQueryCOAID              = "a1000006-0000-0000-0000-000000000002"
	IntentListJournalsID          = "a1000006-0000-0000-0000-000000000003"
	IntentCreateJournalID         = "a1000006-0000-0000-0000-000000000004"
	IntentListBankAccountsID      = "a1000006-0000-0000-0000-000000000005"
	IntentListPaymentsID          = "a1000006-0000-0000-0000-000000000006"
	IntentListTaxInvoicesID       = "a1000006-0000-0000-0000-000000000007"
	IntentListBudgetsID           = "a1000006-0000-0000-0000-000000000008"
	IntentListCashBankID          = "a1000006-0000-0000-0000-000000000009"
	IntentListAssetsID            = "a1000006-0000-0000-0000-00000000000a"
	IntentListSalaryID            = "a1000006-0000-0000-0000-00000000000b"

	// --- Master Data Module ---
	IntentListSuppliersID         = "a1000007-0000-0000-0000-000000000001"
	IntentQuerySupplierID         = "a1000007-0000-0000-0000-000000000002"
	IntentListProductsID          = "a1000007-0000-0000-0000-000000000003"
	IntentQueryProductID          = "a1000007-0000-0000-0000-000000000004"
	IntentCreateProductID         = "a1000007-0000-0000-0000-000000000005"
	IntentListWarehousesID        = "a1000007-0000-0000-0000-000000000006"
	IntentListProductCategoriesID = "a1000007-0000-0000-0000-000000000007"
	IntentListProductBrandsID     = "a1000007-0000-0000-0000-000000000008"
	IntentListPaymentTermsID      = "a1000007-0000-0000-0000-000000000009"
	IntentListCourierAgenciesID   = "a1000007-0000-0000-0000-00000000000a"

	// --- Organization Module ---
	IntentListDivisionsID         = "a1000008-0000-0000-0000-000000000001"
	IntentListJobPositionsID      = "a1000008-0000-0000-0000-000000000002"
	IntentListBusinessUnitsID     = "a1000008-0000-0000-0000-000000000003"
	IntentListAreasID             = "a1000008-0000-0000-0000-000000000004"

	// --- Geographic Module ---
	IntentListProvincesID         = "a1000009-0000-0000-0000-000000000001"
	IntentListCitiesID            = "a1000009-0000-0000-0000-000000000002"
	IntentListDistrictsID         = "a1000009-0000-0000-0000-000000000003"

	// --- Reports Module ---
	IntentGenerateReportID        = "a100000a-0000-0000-0000-000000000001"

	// --- User Management Module ---
	IntentListUsersID             = "a100000b-0000-0000-0000-000000000001"
	IntentListRolesID             = "a100000b-0000-0000-0000-000000000002"
)

// strPtr returns a pointer to the given string
func strPtr(s string) *string {
	return &s
}

// SeedAIIntentRegistry seeds the AI intent registry with available intents
func SeedAIIntentRegistry() error {
	log.Println("Seeding AI intent registry...")

	intents := []models.AIIntentRegistry{
		// ==========================================
		//  HRD MODULE
		// ==========================================
		{
			ID: IntentCreateHolidayID, IntentCode: "CREATE_HOLIDAY", DisplayName: "Create Holiday",
			Description: "Create a new holiday entry in the HRD module",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "holiday.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/holidays",
			ParameterSchema: strPtr(`{"name":"string","date":"string(YYYY-MM-DD)","type":"enum(NATIONAL,COLLECTIVE,COMPANY)","description":"string","is_collective_leave":"boolean","cuts_annual_leave":"boolean"}`),
			IsActive: true,
		},
		{
			ID: IntentListHolidaysID, IntentCode: "LIST_HOLIDAYS", DisplayName: "List Holidays",
			Description: "Query and list holidays with optional filters",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "holiday.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/holidays",
			ParameterSchema: strPtr(`{"year":"integer","type":"enum(NATIONAL,COLLECTIVE,COMPANY)","search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateLeaveRequestID, IntentCode: "CREATE_LEAVE_REQUEST", DisplayName: "Create Leave Request",
			Description: "Submit a new leave request for the current user",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/leave-requests",
			ParameterSchema: strPtr(`{"leave_type_id":"uuid","start_date":"string(YYYY-MM-DD)","end_date":"string(YYYY-MM-DD)","reason":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListLeaveRequestsID, IntentCode: "LIST_LEAVE_REQUESTS", DisplayName: "List Leave Requests",
			Description: "Query leave requests for the current user or all (with permissions)",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/leave-requests",
			ParameterSchema: strPtr(`{"status":"enum(PENDING,APPROVED,REJECTED,CANCELLED)","employee_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentApproveLeaveID, IntentCode: "APPROVE_LEAVE_REQUEST", DisplayName: "Approve Leave Request",
			Description: "Approve a pending leave request",
			Module: "hrd", ActionType: "UPDATE", RequiredPermission: "leave_request.approve", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/leave-requests/:id/approve",
			ParameterSchema: strPtr(`{"employee_name":"string","leave_request_id":"uuid"}`),
			IsActive: true,
		},
		{
			ID: IntentRejectLeaveID, IntentCode: "REJECT_LEAVE_REQUEST", DisplayName: "Reject Leave Request",
			Description: "Reject a pending leave request",
			Module: "hrd", ActionType: "UPDATE", RequiredPermission: "leave_request.approve", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/leave-requests/:id/reject",
			ParameterSchema: strPtr(`{"employee_name":"string","leave_request_id":"uuid","reason":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQueryAttendanceID, IntentCode: "QUERY_ATTENDANCE", DisplayName: "Query Attendance",
			Description: "Query attendance records with optional employee filter",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "attendance.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/attendances",
			ParameterSchema: strPtr(`{"employee_name":"string","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentListEmployeesID, IntentCode: "LIST_EMPLOYEES", DisplayName: "List Employees",
			Description: "Query and list employees with optional filters",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/employees",
			ParameterSchema: strPtr(`{"search":"string","division":"string","position":"string","status":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQueryEmployeeID, IntentCode: "QUERY_EMPLOYEE", DisplayName: "Query Employee",
			Description: "Get details of a specific employee by name or code",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/employees/:id",
			ParameterSchema: strPtr(`{"employee_name":"string","employee_code":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListContractsID, IntentCode: "LIST_CONTRACTS", DisplayName: "List Employee Contracts",
			Description: "Query employee contracts with optional filters",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_contract.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/employee-contracts",
			ParameterSchema: strPtr(`{"employee_name":"string","status":"string","type":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQueryContractID, IntentCode: "QUERY_CONTRACT", DisplayName: "Query Contract",
			Description: "Get details of a specific employee contract",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_contract.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/employee-contracts/:id",
			ParameterSchema: strPtr(`{"employee_name":"string","contract_id":"uuid"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateContractID, IntentCode: "CREATE_CONTRACT", DisplayName: "Create Employee Contract",
			Description: "Create a new employee contract",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "employee_contract.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/employee-contracts",
			ParameterSchema: strPtr(`{"employee_name":"string","contract_type":"string","start_date":"string(YYYY-MM-DD)","end_date":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentListOvertimeID, IntentCode: "LIST_OVERTIME", DisplayName: "List Overtime",
			Description: "Query overtime records",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "overtime.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/overtime",
			ParameterSchema: strPtr(`{"employee_name":"string","status":"string","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateOvertimeID, IntentCode: "CREATE_OVERTIME", DisplayName: "Create Overtime",
			Description: "Submit an overtime request",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "overtime.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/overtime",
			ParameterSchema: strPtr(`{"employee_name":"string","date":"string(YYYY-MM-DD)","hours":"number","reason":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentApproveOvertimeID, IntentCode: "APPROVE_OVERTIME", DisplayName: "Approve Overtime",
			Description: "Approve an overtime request",
			Module: "hrd", ActionType: "UPDATE", RequiredPermission: "overtime.approve", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/overtime/:id/approve",
			ParameterSchema: strPtr(`{"overtime_id":"uuid"}`),
			IsActive: true,
		},
		{
			ID: IntentListWorkScheduleID, IntentCode: "LIST_WORK_SCHEDULES", DisplayName: "List Work Schedules",
			Description: "Query work schedules",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "work_schedule.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/work-schedules",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateWorkScheduleID, IntentCode: "CREATE_WORK_SCHEDULE", DisplayName: "Create Work Schedule",
			Description: "Create a new work schedule",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "work_schedule.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/work-schedules",
			ParameterSchema: strPtr(`{"name":"string","start_time":"string","end_time":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListRecruitmentID, IntentCode: "LIST_RECRUITMENTS", DisplayName: "List Recruitments",
			Description: "Query recruitment requests",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "recruitment.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/recruitments",
			ParameterSchema: strPtr(`{"status":"string","search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateRecruitmentID, IntentCode: "CREATE_RECRUITMENT", DisplayName: "Create Recruitment",
			Description: "Create a new recruitment request",
			Module: "hrd", ActionType: "CREATE", RequiredPermission: "recruitment.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/hrd/recruitments",
			ParameterSchema: strPtr(`{"position":"string","division":"string","quantity":"number","description":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListEvaluationID, IntentCode: "LIST_EVALUATIONS", DisplayName: "List Evaluations",
			Description: "Query employee evaluations",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_evaluation.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/evaluations",
			ParameterSchema: strPtr(`{"employee_name":"string","period":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListCertificationID, IntentCode: "LIST_CERTIFICATIONS", DisplayName: "List Certifications",
			Description: "Query employee certifications",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_certification.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/certifications",
			ParameterSchema: strPtr(`{"employee_name":"string","search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListEducationID, IntentCode: "LIST_EDUCATION_HISTORY", DisplayName: "List Education History",
			Description: "Query employee education history",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_education_history.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/education-history",
			ParameterSchema: strPtr(`{"employee_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListEmployeeAssetID, IntentCode: "LIST_EMPLOYEE_ASSETS", DisplayName: "List Employee Assets",
			Description: "Query assets assigned to employees",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "employee_asset.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/employee-assets",
			ParameterSchema: strPtr(`{"employee_name":"string","search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListLeaveTypesID, IntentCode: "LIST_LEAVE_TYPES", DisplayName: "List Leave Types",
			Description: "Query available leave types",
			Module: "hrd", ActionType: "QUERY", RequiredPermission: "leave_type.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/hrd/leave-types",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  SALES MODULE
		// ==========================================
		{
			ID: IntentCreateSalesQuotID, IntentCode: "CREATE_SALES_QUOTATION", DisplayName: "Create Sales Quotation",
			Description: "Create a new sales quotation for a customer",
			Module: "sales", ActionType: "CREATE", RequiredPermission: "sales_quotation.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/sales/quotations",
			ParameterSchema: strPtr(`{"customer_name":"string","quotation_date":"string(YYYY-MM-DD)","payment_terms_name":"string","business_unit_name":"string","items":"array of {product_name, quantity, price}","notes":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesQuotID, IntentCode: "LIST_SALES_QUOTATIONS", DisplayName: "List Sales Quotations",
			Description: "Query and list sales quotations",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_quotation.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/quotations",
			ParameterSchema: strPtr(`{"search":"string","status":"string","period":"enum(current_month,last_month,current_year)","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentApproveSalesQuotID, IntentCode: "APPROVE_SALES_QUOTATION", DisplayName: "Approve Sales Quotation",
			Description: "Approve a sales quotation",
			Module: "sales", ActionType: "UPDATE", RequiredPermission: "sales_quotation.approve", RequiresConfirmation: true,
			EndpointPath: "/api/v1/sales/quotations/:id/approve",
			ParameterSchema: strPtr(`{"quotation_id":"uuid","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateSalesOrderID, IntentCode: "CREATE_SALES_ORDER", DisplayName: "Create Sales Order",
			Description: "Create a new sales order",
			Module: "sales", ActionType: "CREATE", RequiredPermission: "sales_order.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/sales/orders",
			ParameterSchema: strPtr(`{"customer_name":"string","order_date":"string(YYYY-MM-DD)","items":"array","notes":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesOrdersID, IntentCode: "LIST_SALES_ORDERS", DisplayName: "List Sales Orders",
			Description: "Query and list sales orders",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_order.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/orders",
			ParameterSchema: strPtr(`{"search":"string","status":"string","period":"enum(current_month,last_month,current_year)","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQuerySalesOrderID, IntentCode: "QUERY_SALES_ORDER", DisplayName: "Query Sales Order",
			Description: "Get details of a specific sales order",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_order.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/orders/:id",
			ParameterSchema: strPtr(`{"order_number":"string","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListDeliveryOrdersID, IntentCode: "LIST_DELIVERY_ORDERS", DisplayName: "List Delivery Orders",
			Description: "Query delivery orders",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "delivery_order.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/delivery-orders",
			ParameterSchema: strPtr(`{"search":"string","status":"string","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateDeliveryOrderID, IntentCode: "CREATE_DELIVERY_ORDER", DisplayName: "Create Delivery Order",
			Description: "Create a new delivery order",
			Module: "sales", ActionType: "CREATE", RequiredPermission: "delivery_order.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/sales/delivery-orders",
			ParameterSchema: strPtr(`{"sales_order_id":"uuid","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesInvoicesID, IntentCode: "LIST_SALES_INVOICES", DisplayName: "List Sales Invoices",
			Description: "Query sales invoices (customer invoices)",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "customer_invoice.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/invoices",
			ParameterSchema: strPtr(`{"search":"string","status":"string","customer_name":"string","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateSalesInvoiceID, IntentCode: "CREATE_SALES_INVOICE", DisplayName: "Create Sales Invoice",
			Description: "Create a new sales invoice",
			Module: "sales", ActionType: "CREATE", RequiredPermission: "customer_invoice.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/sales/invoices",
			ParameterSchema: strPtr(`{"delivery_order_id":"uuid","customer_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesVisitsID, IntentCode: "LIST_SALES_VISITS", DisplayName: "List Sales Visits",
			Description: "Query sales visit records",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_visit.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/visits",
			ParameterSchema: strPtr(`{"search":"string","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesEstimationsID, IntentCode: "LIST_SALES_ESTIMATIONS", DisplayName: "List Sales Estimations",
			Description: "Query sales estimations",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_estimation.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/estimations",
			ParameterSchema: strPtr(`{"search":"string","customer_name":"string","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalesTargetsID, IntentCode: "LIST_SALES_TARGETS", DisplayName: "List Sales Targets",
			Description: "Query sales targets",
			Module: "sales", ActionType: "QUERY", RequiredPermission: "sales_target.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/sales/targets",
			ParameterSchema: strPtr(`{"search":"string","period":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  PURCHASE MODULE
		// ==========================================
		{
			ID: IntentListPurchaseRequisitionsID, IntentCode: "LIST_PURCHASE_REQUISITIONS", DisplayName: "List Purchase Requisitions",
			Description: "Query purchase requisitions",
			Module: "purchase", ActionType: "QUERY", RequiredPermission: "purchase_requisition.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/purchase/requisitions",
			ParameterSchema: strPtr(`{"search":"string","status":"string","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentCreatePurchaseRequisitionID, IntentCode: "CREATE_PURCHASE_REQUISITION", DisplayName: "Create Purchase Requisition",
			Description: "Create a new purchase requisition",
			Module: "purchase", ActionType: "CREATE", RequiredPermission: "purchase_requisition.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/purchase/requisitions",
			ParameterSchema: strPtr(`{"supplier_name":"string","items":"array","notes":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListPurchaseOrdersID, IntentCode: "LIST_PURCHASE_ORDERS", DisplayName: "List Purchase Orders",
			Description: "Query purchase orders",
			Module: "purchase", ActionType: "QUERY", RequiredPermission: "purchase_order.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/purchase/orders",
			ParameterSchema: strPtr(`{"search":"string","status":"string","supplier_name":"string","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentCreatePurchaseOrderID, IntentCode: "CREATE_PURCHASE_ORDER", DisplayName: "Create Purchase Order",
			Description: "Create a new purchase order",
			Module: "purchase", ActionType: "CREATE", RequiredPermission: "purchase_order.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/purchase/orders",
			ParameterSchema: strPtr(`{"supplier_name":"string","items":"array","notes":"string","order_date":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentListGoodsReceiptID, IntentCode: "LIST_GOODS_RECEIPTS", DisplayName: "List Goods Receipts",
			Description: "Query goods receipt records",
			Module: "purchase", ActionType: "QUERY", RequiredPermission: "goods_receipt.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/purchase/goods-receipts",
			ParameterSchema: strPtr(`{"search":"string","status":"string","supplier_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSupplierInvoicesID, IntentCode: "LIST_SUPPLIER_INVOICES", DisplayName: "List Supplier Invoices",
			Description: "Query supplier invoices",
			Module: "purchase", ActionType: "QUERY", RequiredPermission: "supplier_invoice.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/purchase/supplier-invoices",
			ParameterSchema: strPtr(`{"search":"string","status":"string","supplier_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentApprovePurchaseOrderID, IntentCode: "APPROVE_PURCHASE_ORDER", DisplayName: "Approve Purchase Order",
			Description: "Approve a purchase order",
			Module: "purchase", ActionType: "UPDATE", RequiredPermission: "purchase_order.approve", RequiresConfirmation: true,
			EndpointPath: "/api/v1/purchase/orders/:id/approve",
			ParameterSchema: strPtr(`{"purchase_order_id":"uuid"}`),
			IsActive: true,
		},

		// ==========================================
		//  STOCK / INVENTORY MODULE
		// ==========================================
		{
			ID: IntentQueryStockID, IntentCode: "QUERY_STOCK", DisplayName: "Query Stock",
			Description: "Check stock levels for products, including product stock availability, low stock, and stock shortage queries (e.g., 'product yang stocknya kurang', 'stok produk')",
			Module: "inventory", ActionType: "QUERY", RequiredPermission: "inventory.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/inventory/stock",
			ParameterSchema: strPtr(`{"product_name":"string","warehouse_name":"string","low_stock":"boolean"}`),
			IsActive: true,
		},
		{
			ID: IntentListInventoryID, IntentCode: "LIST_INVENTORY", DisplayName: "List Inventory",
			Description: "List inventory items with stock information",
			Module: "inventory", ActionType: "QUERY", RequiredPermission: "inventory.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/inventory/stock",
			ParameterSchema: strPtr(`{"search":"string","warehouse_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListStockMovementsID, IntentCode: "LIST_STOCK_MOVEMENTS", DisplayName: "List Stock Movements",
			Description: "Query stock movement history",
			Module: "inventory", ActionType: "QUERY", RequiredPermission: "stock_movement.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/inventory/movements",
			ParameterSchema: strPtr(`{"product_name":"string","warehouse_name":"string","type":"enum(IN,OUT,TRANSFER)","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentListStockOpnameID, IntentCode: "LIST_STOCK_OPNAME", DisplayName: "List Stock Opname",
			Description: "Query stock opname records",
			Module: "inventory", ActionType: "QUERY", RequiredPermission: "stock_opname.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/inventory/stock-opname",
			ParameterSchema: strPtr(`{"warehouse_name":"string","status":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateStockOpnameID, IntentCode: "CREATE_STOCK_OPNAME", DisplayName: "Create Stock Opname",
			Description: "Create a new stock opname session",
			Module: "inventory", ActionType: "CREATE", RequiredPermission: "stock_opname.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/inventory/stock-opname",
			ParameterSchema: strPtr(`{"warehouse_name":"string","notes":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  FINANCE MODULE
		// ==========================================
		{
			ID: IntentListCOAID, IntentCode: "LIST_COA", DisplayName: "List Chart of Accounts",
			Description: "Query chart of accounts",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "coa.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/coa",
			ParameterSchema: strPtr(`{"search":"string","type":"string","parent_code":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQueryCOAID, IntentCode: "QUERY_COA", DisplayName: "Query Account",
			Description: "Get details of a specific account in chart of accounts",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "coa.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/coa/:id",
			ParameterSchema: strPtr(`{"account_code":"string","account_name":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListJournalsID, IntentCode: "LIST_JOURNALS", DisplayName: "List Journal Entries",
			Description: "Query journal entries",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "journal.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/journals",
			ParameterSchema: strPtr(`{"search":"string","period":"enum(current_month,last_month,current_year)","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateJournalID, IntentCode: "CREATE_JOURNAL", DisplayName: "Create Journal Entry",
			Description: "Create a new journal entry",
			Module: "finance", ActionType: "CREATE", RequiredPermission: "journal.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/finance/journals",
			ParameterSchema: strPtr(`{"date":"string(YYYY-MM-DD)","description":"string","entries":"array"}`),
			IsActive: true,
		},
		{
			ID: IntentListBankAccountsID, IntentCode: "LIST_BANK_ACCOUNTS", DisplayName: "List Bank Accounts",
			Description: "Query bank accounts",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "bank_account.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/bank-accounts",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListPaymentsID, IntentCode: "LIST_PAYMENTS", DisplayName: "List Payments",
			Description: "Query payment records",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "payment.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/payments",
			ParameterSchema: strPtr(`{"search":"string","status":"string","type":"enum(INCOMING,OUTGOING)","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentListTaxInvoicesID, IntentCode: "LIST_TAX_INVOICES", DisplayName: "List Tax Invoices",
			Description: "Query tax invoices (faktur pajak)",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "tax_invoice.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/tax-invoices",
			ParameterSchema: strPtr(`{"search":"string","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentListBudgetsID, IntentCode: "LIST_BUDGETS", DisplayName: "List Budgets",
			Description: "Query budget entries",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "budget.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/budgets",
			ParameterSchema: strPtr(`{"search":"string","period":"string","department":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListCashBankID, IntentCode: "LIST_CASH_BANK", DisplayName: "List Cash & Bank",
			Description: "Query cash and bank transaction records",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "cash_bank.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/cash-bank",
			ParameterSchema: strPtr(`{"search":"string","type":"enum(CASH,BANK)","period":"enum(current_month,last_month,current_year)"}`),
			IsActive: true,
		},
		{
			ID: IntentListAssetsID, IntentCode: "LIST_ASSETS", DisplayName: "List Fixed Assets",
			Description: "Query company fixed assets",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "asset.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/assets",
			ParameterSchema: strPtr(`{"search":"string","category":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListSalaryID, IntentCode: "LIST_SALARY", DisplayName: "List Salary Records",
			Description: "Query salary/payroll records",
			Module: "finance", ActionType: "QUERY", RequiredPermission: "salary.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/finance/salary",
			ParameterSchema: strPtr(`{"employee_name":"string","period":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  MASTER DATA MODULE
		// ==========================================
		{
			ID: IntentListSuppliersID, IntentCode: "LIST_SUPPLIERS", DisplayName: "List Suppliers",
			Description: "Query suppliers",
			Module: "master", ActionType: "QUERY", RequiredPermission: "supplier.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/suppliers",
			ParameterSchema: strPtr(`{"search":"string","status":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQuerySupplierID, IntentCode: "QUERY_SUPPLIER", DisplayName: "Query Supplier",
			Description: "Get details of a specific supplier",
			Module: "master", ActionType: "QUERY", RequiredPermission: "supplier.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/suppliers/:id",
			ParameterSchema: strPtr(`{"supplier_name":"string","supplier_code":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListProductsID, IntentCode: "LIST_PRODUCTS", DisplayName: "List Products",
			Description: "Browse the product catalog (NOT for stock levels). For stock-related queries, use QUERY_STOCK instead.",
			Module: "master", ActionType: "QUERY", RequiredPermission: "product.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/products",
			ParameterSchema: strPtr(`{"search":"string","category":"string","brand":"string","status":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentQueryProductID, IntentCode: "QUERY_PRODUCT", DisplayName: "Query Product",
			Description: "Get details of a specific product by name or SKU",
			Module: "master", ActionType: "QUERY", RequiredPermission: "product.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/products/:id",
			ParameterSchema: strPtr(`{"product_name":"string","sku":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentCreateProductID, IntentCode: "CREATE_PRODUCT", DisplayName: "Create Product",
			Description: "Create a new product",
			Module: "master", ActionType: "CREATE", RequiredPermission: "product.create", RequiresConfirmation: true,
			EndpointPath: "/api/v1/products",
			ParameterSchema: strPtr(`{"name":"string","sku":"string","category":"string","brand":"string","price":"number","unit":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListWarehousesID, IntentCode: "LIST_WAREHOUSES", DisplayName: "List Warehouses",
			Description: "Query warehouses",
			Module: "master", ActionType: "QUERY", RequiredPermission: "warehouse.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/warehouses",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListProductCategoriesID, IntentCode: "LIST_PRODUCT_CATEGORIES", DisplayName: "List Product Categories",
			Description: "Query product categories",
			Module: "master", ActionType: "QUERY", RequiredPermission: "product_category.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/products/categories",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListProductBrandsID, IntentCode: "LIST_PRODUCT_BRANDS", DisplayName: "List Product Brands",
			Description: "Query product brands",
			Module: "master", ActionType: "QUERY", RequiredPermission: "product_brand.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/products/brands",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListPaymentTermsID, IntentCode: "LIST_PAYMENT_TERMS", DisplayName: "List Payment Terms",
			Description: "Query payment terms",
			Module: "master", ActionType: "QUERY", RequiredPermission: "payment_term.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/payment-terms",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListCourierAgenciesID, IntentCode: "LIST_COURIER_AGENCIES", DisplayName: "List Courier Agencies",
			Description: "Query courier agencies",
			Module: "master", ActionType: "QUERY", RequiredPermission: "courier_agency.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/courier-agencies",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  ORGANIZATION MODULE
		// ==========================================
		{
			ID: IntentListDivisionsID, IntentCode: "LIST_DIVISIONS", DisplayName: "List Divisions",
			Description: "Query company divisions/departments",
			Module: "organization", ActionType: "QUERY", RequiredPermission: "division.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/organization/divisions",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListJobPositionsID, IntentCode: "LIST_JOB_POSITIONS", DisplayName: "List Job Positions",
			Description: "Query job positions",
			Module: "organization", ActionType: "QUERY", RequiredPermission: "job_position.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/organization/job-positions",
			ParameterSchema: strPtr(`{"search":"string","division":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListBusinessUnitsID, IntentCode: "LIST_BUSINESS_UNITS", DisplayName: "List Business Units",
			Description: "Query business units",
			Module: "organization", ActionType: "QUERY", RequiredPermission: "business_unit.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/organization/business-units",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListAreasID, IntentCode: "LIST_AREAS", DisplayName: "List Areas",
			Description: "Query geographic areas",
			Module: "organization", ActionType: "QUERY", RequiredPermission: "area.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/organization/areas",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  GEOGRAPHIC MODULE
		// ==========================================
		{
			ID: IntentListProvincesID, IntentCode: "LIST_PROVINCES", DisplayName: "List Provinces",
			Description: "Query provinces",
			Module: "geographic", ActionType: "QUERY", RequiredPermission: "geographic.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/geographic/provinces",
			ParameterSchema: strPtr(`{"search":"string","country_id":"uuid"}`),
			IsActive: true,
		},
		{
			ID: IntentListCitiesID, IntentCode: "LIST_CITIES", DisplayName: "List Cities",
			Description: "Query cities/regencies",
			Module: "geographic", ActionType: "QUERY", RequiredPermission: "geographic.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/geographic/cities",
			ParameterSchema: strPtr(`{"search":"string","province_id":"uuid"}`),
			IsActive: true,
		},
		{
			ID: IntentListDistrictsID, IntentCode: "LIST_DISTRICTS", DisplayName: "List Districts",
			Description: "Query districts",
			Module: "geographic", ActionType: "QUERY", RequiredPermission: "geographic.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/geographic/districts",
			ParameterSchema: strPtr(`{"search":"string","city_id":"uuid"}`),
			IsActive: true,
		},

		// ==========================================
		//  REPORTS MODULE
		// ==========================================
		{
			ID: IntentGenerateReportID, IntentCode: "GENERATE_REPORT", DisplayName: "Generate Report",
			Description: "Generate a business report (sales, finance, inventory, HRD)",
			Module: "reports", ActionType: "QUERY", RequiredPermission: "report.generate", RequiresConfirmation: false,
			EndpointPath: "/api/v1/reports",
			ParameterSchema: strPtr(`{"report_type":"enum(sales,finance,inventory,hrd,purchase)","period":"enum(daily,weekly,monthly,quarterly,yearly)","date_from":"string(YYYY-MM-DD)","date_to":"string(YYYY-MM-DD)"}`),
			IsActive: true,
		},

		// ==========================================
		//  USER MANAGEMENT MODULE
		// ==========================================
		{
			ID: IntentListUsersID, IntentCode: "LIST_USERS", DisplayName: "List Users",
			Description: "Query system users",
			Module: "admin", ActionType: "QUERY", RequiredPermission: "user.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/users",
			ParameterSchema: strPtr(`{"search":"string","role":"string","status":"string"}`),
			IsActive: true,
		},
		{
			ID: IntentListRolesID, IntentCode: "LIST_ROLES", DisplayName: "List Roles",
			Description: "Query system roles",
			Module: "admin", ActionType: "QUERY", RequiredPermission: "role.read", RequiresConfirmation: false,
			EndpointPath: "/api/v1/roles",
			ParameterSchema: strPtr(`{"search":"string"}`),
			IsActive: true,
		},

		// ==========================================
		//  GENERAL
		// ==========================================
		{
			ID: IntentGeneralChatID, IntentCode: "GENERAL_CHAT", DisplayName: "General Chat",
			Description: "General conversation and questions about the GIMS system",
			Module: "general", ActionType: "QUERY", RequiredPermission: "", RequiresConfirmation: false,
			EndpointPath: "", ParameterSchema: strPtr(`{}`),
			IsActive: true,
		},
	}

	for _, intent := range intents {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "description", "module", "action_type", "required_permission", "requires_confirmation", "endpoint_path", "parameter_schema", "is_active", "updated_at"}),
		}).Create(&intent).Error; err != nil {
			log.Printf("Warning: Failed to seed AI intent %s: %v", intent.IntentCode, err)
		}
	}

	log.Printf("AI intent registry seeded successfully (%d intents)", len(intents))
	return nil
}
