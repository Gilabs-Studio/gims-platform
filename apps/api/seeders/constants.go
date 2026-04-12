package seeders

// Role IDs (Fixed)
const (
	AdminRoleID          = "5a04cc88-8495-4e4f-ab96-f7ec86cb7208"
	ManagerRoleID        = "b2e2a3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c" // Reusing ID for stability
	StaffRoleID          = "c3f3b4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d" // Reusing ID for stability
	ViewerRoleID         = "d4a4c5d6-f7a8-4b9c-0d1e-2f3a4b5c6d7e"
	AreaSupervisorRoleID = "e5b5d6e7-a8b9-4c0d-1e2f-3a4b5c6d7e8f"
	SalesDirectorRoleID  = "f6c6e7f8-b9c0-4d1e-2f3a-4b5c6d7e8f9a"
	FinanceManagerRoleID = "a7d7f8a9-c0d1-4e2f-3a4b-5c6d7e8f9a0b"
	AccountantRoleID     = "b8e8a9b0-d1e2-4f3a-5b6c-7d8e9f0a1b2c"
	AuditorRoleID        = "c9f9b0c1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"
)

// User IDs (Fixed)
const (
	AdminUserID   = "ee0b14e0-c651-4814-a5a2-e7398f81dcf4"
	ManagerUserID = "2b83a042-45e3-46d4-a957-3f8d22384784"
	StaffUserID   = "51d45763-8a39-4d6b-b4dc-7d2e057865c6"
	ViewerUserID  = "98f45a2d-3c21-41b5-82e6-1234567890ab"
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

// Area IDs (Fixed — valid UUID v4)
const (
	AreaJabodetabekID     = "a99a4611-c507-444c-a2a1-223a74684c6e"
	AreaJawaBaratID       = "e9db0ad5-b65c-4996-bf5f-79703b1c6a7f"
	AreaJawaTengahID      = "d0b18c17-5758-4e28-90a7-057da1ddcbab"
	AreaJawaTimurID       = "0c5300dc-67b1-44d2-bcca-cdab1e66aae7"
	AreaBaliID            = "baeb3573-5d88-483f-bf4b-5ed5d186df42"
	AreaBantenID          = "379536e2-6c2a-4f45-b8ef-4bf48be180c6"
	AreaDIYID             = "3fc2a613-e181-4d76-8307-2c8185c14df9"
	AreaSumateraUtaraID   = "08f4078b-de5e-465f-8302-981b296d96ac"
	AreaSulawesiSelatanID = "15382c90-60e5-45e6-903a-93b0aef5e37a"
	AreaKalimantanTimurID = "f96df85e-d4cc-4db0-b821-3b3b6b4768fb"
)

// Employee IDs (Fixed)
const (
	AdminEmployeeID        = "11111111-1111-1111-1111-111111111111"
	ManagerEmployeeID      = "22222222-2222-2222-2222-222222222222"
	StaffEmployeeID        = "33333333-3333-3333-3333-333333333333"
	SalesRep1EmployeeID    = "44444444-4444-4444-4444-444444444444"
	SalesRep2EmployeeID    = "55555555-5555-5555-5555-555555555555"
	FinanceStaffEmployeeID = "66666666-6666-6666-6666-666666666666"
	HRStaffEmployeeID      = "77777777-7777-7777-7777-777777777777"
)

// Customer Type IDs (Fixed - hex only: 0-9, a-f)
const (
	CustomerTypeHospitalID  = "c0000001-0000-0000-0000-000000000001"
	CustomerTypeClinicID    = "c0000001-0000-0000-0000-000000000002"
	CustomerTypePharmacyID  = "c0000001-0000-0000-0000-000000000003"
	CustomerTypePuskesmasID = "c0000001-0000-0000-0000-000000000004"
	CustomerTypeDistribID   = "c0000001-0000-0000-0000-000000000005"
)

// Customer IDs (Fixed - hex only: 0-9, a-f)
const (
	Customer1ID = "c0000002-0000-0000-0000-000000000001" // PT Apotek Sehat Sentosa
	Customer2ID = "c0000002-0000-0000-0000-000000000002" // RS Harapan Kita Jakarta
	Customer3ID = "c0000002-0000-0000-0000-000000000003" // Klinik Pratama Medika
	Customer4ID = "c0000002-0000-0000-0000-000000000004" // RS Siloam Hospitals Surabaya
	Customer5ID = "c0000002-0000-0000-0000-000000000005" // Apotek Kimia Farma Cabang Bekasi
	Customer6ID = "c0000002-0000-0000-0000-000000000006" // Puskesmas Cempaka Putih
)
