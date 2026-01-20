package seeders

// Role IDs (Fixed)
const (
	AdminRoleID      = "5a04cc88-8495-4e4f-ab96-f7ec86cb7208"
	ManagerRoleID    = "b2e2a3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c" // Reusing ID for stability
	StaffRoleID      = "c3f3b4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d" // Reusing ID for stability
	ViewerRoleID     = "d4a4c5d6-f7a8-4b9c-0d1e-2f3a4b5c6d7e"
)

// User IDs (Fixed)
const (
	AdminUserID      = "ee0b14e0-c651-4814-a5a2-e7398f81dcf4"
	ManagerUserID    = "2b83a042-45e3-46d4-a957-3f8d22384784"
	StaffUserID      = "51d45763-8a39-4d6b-b4dc-7d2e057865c6"
	ViewerUserID     = "98f45a2d-3c21-41b5-82e6-1234567890ab"
)

// Organization IDs (Fixed)
const (
	// Company
	GiLabsCompanyID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"

	// Divisions
	SalesDivisionID   = "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"
	OpsDivisionID     = "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f"
	FinanceDivisionID = "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a"
	HRDivisionID      = "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b"
	ITDivisionID      = "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c"

	// Job Positions
	DirectorPositionID   = "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d"
	ManagerPositionID    = "8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e"
	SupervisorPositionID = "9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f"
	StaffPositionID      = "0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a"
	AdminPositionID      = "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b"
	SalesRepPositionID   = "2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c"

	// Business Units
	UnitRetailID    = "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d"
	UnitWholesaleID = "4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e"
)

// Employee IDs (Fixed)
const (
	AdminEmployeeID   = "11111111-1111-1111-1111-111111111111"
	ManagerEmployeeID = "22222222-2222-2222-2222-222222222222"
	StaffEmployeeID   = "33333333-3333-3333-3333-333333333333"
)
