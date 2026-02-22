# Employee Contract Management (Master Data > Employees)

> **Modul**: Master Data > Employees
> **Backend**: `apps/api/internal/organization/`
> **Frontend**: `apps/web/src/features/master-data/employee/`

---

## Ringkasan Fitur

Employee Contract Management mengelola siklus hidup kontrak kerja karyawan. Contract merupakan bagian dari data master karyawan, bukan transaksi HRD, sehingga dikelola langsung di modul Employee.

### Fitur Utama

- Create employee dengan optional initial contract (atomic)
- Create contract terpisah untuk existing employee
- Update/Edit contract (nomor kontrak, tipe, tanggal, dokumen — form auto-prefill)
- Terminate contract (resign, PHK, dll)
- Renew contract (buat kontrak baru, expire yang lama)
- Correct active contract (koreksi data tanpa mengubah histori)
- Contract history timeline dengan download dokumen
- Document upload untuk kontrak (nama file asli ditampilkan & bisa di-download)
- End date validation (tidak bisa sebelum/sama dengan start date)
- i18n support penuh (EN & ID), termasuk tipe kontrak: PKWTT, PKWT, Magang

---

## Business Rules

### Contract Types

| Type   | Nama Lengkap                             | End Date | Keterangan          |
| ------ | ---------------------------------------- | -------- | ------------------- |
| PKWTT  | Perjanjian Kerja Waktu Tidak Tertentu    | Dilarang | Kontrak permanent   |
| PKWT   | Perjanjian Kerja Waktu Tertentu          | Wajib    | Kontrak waktu fixed |
| Intern | Magang                                   | Wajib    | Kontrak magang      |

### Contract Status

| Status     | Keterangan                        |
| ---------- | --------------------------------- |
| ACTIVE     | Kontrak berlaku                   |
| EXPIRED    | Kontrak telah diganti/dikoreksi   |
| TERMINATED | Kontrak diakhiri secara manual    |

### Validasi Penting

1. **`contract_number` wajib diisi** — tidak ada auto-generate berdasarkan employee code
2. **PKWTT** tidak boleh punya `end_date`
3. **PKWT/Intern** wajib punya `end_date`
4. **`end_date`** tidak boleh pada atau sebelum `start_date`
5. Satu employee hanya boleh punya **satu kontrak ACTIVE** pada satu waktu
6. Contract yang sudah **TERMINATED** tidak bisa dimodifikasi
7. `contract_number` harus unik secara global

---

## Keputusan Teknis

1. **Atomic Employee + Contract Creation**: Frontend mengirim `initial_contract` nested di dalam request create employee. Backend membuat keduanya dalam satu operasi.
2. **No Salary/JobTitle/Department**: Field ini dihapus dari contract karena sudah ada di data employee (`job_position_id`, `division_id`). Privacy concern untuk salary.
3. **Contract Type Simplification**: Dari 4 tipe (PERMANENT, CONTRACT, INTERNSHIP, PROBATION) menjadi 3 (PKWTT, PKWT, Intern). Probation dianggap status dalam PKWT.
4. **Contract Number Wajib Diisi**: `contract_number` harus diisi manual oleh user, baik saat create employee (initial contract) maupun saat create/renew contract. Tidak ada auto-generate berdasarkan employee code.
5. **Correct = Create New + Expire Old**: Action correct membuat kontrak baru (dengan suffix `-C` pada nomor) dan meng-expire kontrak lama. Field `corrected_from_contract_id` menyimpan relasi.
6. **Renew = Create New + Expire Old**: Action renew membuat kontrak baru dan meng-expire kontrak lama.
7. **End Date Validation**: Datepicker `end_date` tidak mengizinkan pemilihan tanggal pada atau sebelum `start_date` yang dipilih (berlaku di form create employee, create contract, dan edit contract).
8. **Edit Contract Pre-fill**: Dialog edit contract otomatis terisi data kontrak yang sedang diedit saat dibuka.
9. **Filename UX**: Backend menyimpan `{uuid}_{sanitized_original_name}.{ext}` agar frontend bisa menampilkan nama file asli yang bisa di-download.

---

## API Endpoints

Base URL: `/api/v1/organization/employees`

### Employee CRUD (with contract support)

| Method | Endpoint                                           | Description                          | Permission        |
| ------ | -------------------------------------------------- | ------------------------------------ | ----------------- |
| POST   | `/employees`                                       | Create employee (+ optional contract)| employee.create   |
| GET    | `/employees`                                       | List employees                       | employee.read     |
| GET    | `/employees/:id`                                   | Get employee detail                  | employee.read     |
| PUT    | `/employees/:id`                                   | Update employee                      | employee.update   |
| DELETE | `/employees/:id`                                   | Delete employee (soft)               | employee.delete   |
| GET    | `/employees/form-data`                             | Get form dropdown options            | employee.read     |

### Contract Management

| Method | Endpoint                                           | Description            | Permission        |
| ------ | -------------------------------------------------- | ---------------------- | ----------------- |
| GET    | `/employees/:id/contracts`                         | List all contracts     | employee.read     |
| POST   | `/employees/:id/contracts`                         | Create new contract    | employee.update   |
| GET    | `/employees/:id/contracts/active`                  | Get active contract    | employee.read     |
| PUT    | `/employees/:id/contracts/:contract_id`            | Update contract        | employee.update   |
| DELETE | `/employees/:id/contracts/:contract_id`            | Delete contract (soft) | employee.delete   |
| POST   | `/employees/:id/contracts/:contract_id/terminate`  | Terminate contract     | employee.update   |
| POST   | `/employees/:id/contracts/:contract_id/renew`      | Renew contract         | employee.update   |
| PATCH  | `/employees/:id/contracts/active`                  | Correct active contract| employee.update   |

---

## Request/Response Bodies

### POST /employees — Create Employee

```json
{
  "employee_code": "EMP001",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+6281234567890",
  "division_id": "uuid",
  "job_position_id": "uuid",
  "company_id": "uuid",
  "date_of_birth": "1990-01-15T00:00:00Z",
  "place_of_birth": "Jakarta",
  "gender": "male",
  "religion": "Islam",
  "address": "Jl. Sudirman No. 123, Jakarta",
  "village_id": "uuid",
  "nik": "3171234567890001",
  "npwp": "12.345.678.9-012.000",
  "bpjs": "0001234567890",
  "total_leave_quota": 12,
  "ptkp_status": "TK/0",
  "is_disability": false,
  "replacement_for_id": null,
  "area_ids": ["uuid1", "uuid2"],
  "supervised_area_ids": [],
  "is_active": true,
  "initial_contract": {
    "contract_number": "CTR-EMP001-001",
    "contract_type": "PKWTT",
    "start_date": "2026-02-01",
    "end_date": "",
    "document_path": "/uploads/uuid_contract.pdf"
  }
}
```

> `initial_contract` bersifat opsional. Jika tidak disertakan, employee dibuat tanpa kontrak.
> `contract_number` wajib diisi (tidak ada auto-generate).

### POST /employees/:id/contracts — Create Contract

```json
{
  "contract_number": "CTR-EMP001-002",
  "contract_type": "PKWT",
  "start_date": "2026-03-01",
  "end_date": "2027-03-01",
  "document_path": "/uploads/uuid_contract.pdf"
}
```

### PUT /employees/:id/contracts/:contract_id — Update Contract

```json
{
  "contract_number": "CTR-EMP001-002-REV",
  "contract_type": "PKWT",
  "start_date": "2026-03-01",
  "end_date": "2027-06-01",
  "document_path": "/uploads/uuid_new_doc.pdf"
}
```

> Semua field opsional. Hanya field yang dikirim yang akan diupdate.

### POST /employees/:id/contracts/:contract_id/terminate — Terminate

```json
{
  "reason": "RESIGN",
  "notes": "Employee resigned voluntarily"
}
```

> `reason` wajib (max 100 char). `notes` opsional (max 1000 char).

### POST /employees/:id/contracts/:contract_id/renew — Renew

```json
{
  "contract_number": "CTR-EMP001-003",
  "contract_type": "PKWT",
  "start_date": "2027-03-01",
  "end_date": "2028-03-01",
  "document_path": "/uploads/uuid_renewal.pdf"
}
```

> Membuat kontrak baru dan meng-expire kontrak lama.

### PATCH /employees/:id/contracts/active — Correct Active Contract

```json
{
  "end_date": "2027-06-01",
  "document_path": "/uploads/uuid_corrected.pdf"
}
```

> Membuat kontrak baru (nomor = `{old_number}-C`) dan meng-expire kontrak lama. Field `corrected_from_contract_id` otomatis diisi.

### Response: EmployeeContractResponse

```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "contract_number": "CTR-EMP001-001",
  "contract_type": "PKWTT",
  "start_date": "2026-02-01",
  "end_date": null,
  "document_path": "/uploads/uuid_contract.pdf",
  "status": "ACTIVE",
  "is_expiring_soon": false,
  "days_until_expiry": null,
  "terminated_at": null,
  "termination_reason": "",
  "termination_notes": "",
  "expired_at": null,
  "corrected_from_contract_id": null,
  "created_at": "2026-02-22T10:00:00Z",
  "updated_at": "2026-02-22T10:00:00Z"
}
```

---

## Cara Test Manual

### 1. Create Employee dengan Contract

```bash
curl -X POST http://localhost:8080/api/v1/organization/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "employee_code": "EMP001",
    "name": "John Doe",
    "email": "john@example.com",
    "gender": "male",
    "initial_contract": {
      "contract_number": "CTR-EMP001-001",
      "contract_type": "PKWTT",
      "start_date": "2026-02-01"
    }
  }'
```

### 2. Create Employee tanpa Contract

```bash
curl -X POST http://localhost:8080/api/v1/organization/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "employee_code": "EMP002",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "gender": "female"
  }'
```

### 3. Create Contract untuk Existing Employee

```bash
curl -X POST http://localhost:8080/api/v1/organization/employees/:id/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "contract_number": "CTR-EMP002-001",
    "contract_type": "PKWT",
    "start_date": "2026-03-01",
    "end_date": "2027-03-01"
  }'
```

### 4. View Contract History

```bash
curl http://localhost:8080/api/v1/organization/employees/:id/contracts \
  -H "Authorization: Bearer $TOKEN"
```

### 5. View Active Contract

```bash
curl http://localhost:8080/api/v1/organization/employees/:id/contracts/active \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Terminate Contract

```bash
curl -X POST http://localhost:8080/api/v1/organization/employees/:id/contracts/:contractId/terminate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "reason": "RESIGN",
    "notes": "Employee resigned voluntarily"
  }'
```

### 7. Renew Contract

```bash
curl -X POST http://localhost:8080/api/v1/organization/employees/:id/contracts/:contractId/renew \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "contract_number": "CTR-EMP001-002",
    "contract_type": "PKWT",
    "start_date": "2027-03-01",
    "end_date": "2028-03-01"
  }'
```

### 8. Correct Active Contract

```bash
curl -X PATCH http://localhost:8080/api/v1/organization/employees/:id/contracts/active \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "end_date": "2027-06-01",
    "document_path": "/uploads/uuid_corrected.pdf"
  }'
```

---

## Backend Folder Structure

```
apps/api/internal/organization/
├── data/
│   ├── models/
│   │   ├── employee.go
│   │   └── employee_contract.go
│   └── repositories/
│       ├── employee_repository.go
│       └── employee_contract_repository.go
├── domain/
│   ├── dto/
│   │   ├── employee_dto.go
│   │   └── employee_contract_dto.go
│   ├── mapper/
│   │   └── employee_mapper.go
│   └── usecase/
│       └── employee_usecase.go
└── presentation/
    ├── handler/
    │   └── employee_handler.go
    ├── router/
    │   └── employee_routers.go
    └── routers.go
```

## Frontend Folder Structure

```
apps/web/src/features/master-data/employee/
├── components/
│   ├── contracts/
│   │   ├── contract-info-card.tsx      # Card info kontrak aktif
│   │   ├── contract-timeline.tsx       # Timeline riwayat kontrak
│   │   ├── create-contract-dialog.tsx  # Dialog buat kontrak baru
│   │   ├── correct-contract-dialog.tsx # Dialog koreksi kontrak aktif
│   │   ├── edit-contract-dialog.tsx    # Dialog edit kontrak (auto-prefill)
│   │   ├── renew-contract-dialog.tsx   # Dialog perpanjang kontrak
│   │   ├── terminate-contract-dialog.tsx # Dialog terminasi kontrak
│   │   └── index.ts                   # Barrel exports
│   ├── employee-detail-modal.tsx
│   ├── employee-form.tsx
│   └── employee-list.tsx
├── hooks/
│   └── use-employees.ts
├── i18n/
│   ├── en.ts
│   └── id.ts
├── schemas/
│   └── employee.schema.ts
├── services/
│   └── employee-service.ts
└── types/
    └── index.d.ts
```

---

## Database Schema

### employee_contracts

| Column                       | Type         | Nullable | Description                              |
| ---------------------------- | ------------ | -------- | ---------------------------------------- |
| id                           | uuid (PK)    | No       | Auto-generated                           |
| employee_id                  | uuid (FK)    | No       | References employees.id                  |
| contract_number              | varchar(50)  | No       | Unique                                   |
| contract_type                | varchar(20)  | No       | PKWTT, PKWT, Intern                      |
| start_date                   | date         | No       |                                          |
| end_date                     | date         | Yes      | NULL for PKWTT                           |
| document_path                | varchar(255) | Yes      | URL ke uploaded file                     |
| status                       | varchar(20)  | No       | ACTIVE, EXPIRED, TERMINATED              |
| terminated_at                | timestamp    | Yes      | Waktu terminasi                          |
| termination_reason           | varchar(100) | Yes      | Alasan terminasi                         |
| termination_notes            | text         | Yes      | Catatan terminasi                        |
| expired_at                   | timestamp    | Yes      | Waktu expire                             |
| corrected_from_contract_id   | uuid (FK)    | Yes      | References employee_contracts.id         |
| created_by                   | uuid         | No       | User yang membuat                        |
| updated_by                   | uuid         | Yes      | User yang terakhir update                |
| created_at                   | timestamp    | No       |                                          |
| updated_at                   | timestamp    | No       |                                          |
| deleted_at                   | timestamp    | Yes      | Soft delete                              |

### Indexes

```sql
CREATE INDEX idx_employee_contracts_employee ON employee_contracts(employee_id);
CREATE UNIQUE INDEX idx_employee_contracts_number ON employee_contracts(contract_number);
CREATE INDEX idx_employee_contracts_type ON employee_contracts(contract_type);
CREATE INDEX idx_employee_contracts_dates ON employee_contracts(start_date, end_date);
CREATE INDEX idx_employee_contracts_status ON employee_contracts(status);
CREATE INDEX idx_employee_contracts_deleted ON employee_contracts(deleted_at);
```

---

## Permissions

```
employee.read      - View employee & contract info
employee.create    - Create employee (with optional contract)
employee.update    - Update employee, create/update/terminate/renew/correct contracts
employee.delete    - Delete employee or contract (soft delete)
employee.approve   - Approve/reject employee
```

---

## Related Links

- **Frontend**: `apps/web/src/features/master-data/employee/`
- **Backend**: `apps/api/internal/organization/`
- **Postman Collection**: `docs/postman/postman.json`

---

## Document Version

- **Version**: 3.1.0
- **Last Updated**: 2026-02-22
- **Changelog v3.1.0**: Contract number wajib diisi (hapus auto-generate), end date validation, edit contract auto-prefill, document download di timeline, i18n lengkap
