# Employee Education History Management (Master Data > Employees)

> **Modul**: Master Data > Employees
> **Backend**: `apps/api/internal/organization/`
> **Frontend**: `apps/web/src/features/master-data/employee/`

---

## Ringkasan Fitur

Employee Education History mengelola riwayat pendidikan karyawan. Education history merupakan bagian dari data master karyawan (bukan modul HRD terpisah) sehingga dikelola langsung di modul Employee sebagai sub-resource.

### Fitur Utama

- CRUD education history per karyawan (di dalam employee detail modal)
- Education information section di tab Overview (read-only, menampilkan pendidikan terbaru/ongoing)
- Education History tab dengan timeline visual dan action buttons
- Document upload untuk ijazah/sertifikat pendidikan
- GPA tracking (skala 0-4)
- Ongoing education support (end_date nullable)
- i18n support penuh (EN & ID)

---

## Business Rules

### Degree Levels

| Level       | EN                 | ID          |
| ----------- | ------------------ | ----------- |
| ELEMENTARY  | Elementary School  | SD          |
| JUNIOR_HIGH | Junior High School | SMP         |
| SENIOR_HIGH | Senior High School | SMA/SMK     |
| DIPLOMA     | Diploma            | Diploma     |
| BACHELOR    | Bachelor's Degree  | Sarjana (S1)|
| MASTER      | Master's Degree    | Magister (S2)|
| DOCTORATE   | Doctorate          | Doktor (S3) |

### Latest Education Logic

1. Prioritas: pendidikan yang sedang berjalan (end_date = null)
2. Jika tidak ada ongoing, ambil yang paling baru berdasarkan start_date
3. Ditampilkan di `EmployeeResponse.latest_education` dan Overview tab

### Permissions

| Action | Permission Required |
| ------ | ------------------- |
| View   | `employee.read`     |
| Create | `employee.update`   |
| Edit   | `employee.update`   |
| Delete | `employee.delete`   |

---

## API Endpoints

Base path: `/api/v1/organization/employees/:id/education-histories`

| Method | Path                          | Permission        | Description                       |
| ------ | ----------------------------- | ----------------- | --------------------------------- |
| GET    | `/:id/education-histories`    | `employee.read`   | List all education for employee   |
| POST   | `/:id/education-histories`    | `employee.update` | Create education history          |
| PUT    | `/:id/education-histories/:education_id` | `employee.update` | Update education history |
| DELETE | `/:id/education-histories/:education_id` | `employee.delete` | Delete education history |

### Request: Create Education History

```json
POST /api/v1/organization/employees/:id/education-histories
{
  "institution": "Universitas Indonesia",
  "degree": "BACHELOR",
  "field_of_study": "Computer Science",
  "start_date": "2018-09-01",
  "end_date": "2022-07-15",
  "gpa": 3.75,
  "description": "Cum Laude",
  "document_path": "/uploads/documents/ijazah.pdf"
}
```

### Request: Update Education History

```json
PUT /api/v1/organization/employees/:id/education-histories/:education_id
{
  "institution": "Universitas Indonesia",
  "degree": "BACHELOR",
  "field_of_study": "Computer Science",
  "end_date": "2022-08-01",
  "gpa": 3.80
}
```

### Response: Education History

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "institution": "Universitas Indonesia",
    "degree": "BACHELOR",
    "field_of_study": "Computer Science",
    "start_date": "2018-09-01",
    "end_date": "2022-07-15",
    "gpa": 3.75,
    "description": "Cum Laude",
    "document_path": "/uploads/documents/ijazah.pdf",
    "is_completed": true,
    "duration_years": 3.87,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
}
```

### Employee Response (with latest_education)

```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "latest_education": {
      "id": "uuid",
      "institution": "Universitas Indonesia",
      "degree": "BACHELOR",
      "field_of_study": "Computer Science",
      "start_date": "2018-09-01",
      "end_date": "2022-07-15",
      "gpa": 3.75,
      "is_completed": true
    }
  }
}
```

---

## Architecture

### Backend (Go)

```
apps/api/internal/organization/
├── data/
│   ├── models/
│   │   └── employee_education_history.go   # GORM model
│   └── repositories/
│       └── employee_education_history_repository.go  # Repository interface + impl
├── domain/
│   ├── dto/
│   │   ├── employee_dto.go                 # EmployeeEducationBriefResponse + LatestEducation field
│   │   └── employee_education_history_dto.go  # Create/Update/Response DTOs
│   ├── mapper/
│   │   ├── employee_mapper.go              # Updated: ToEmployeeResponse accepts latestEducation
│   │   └── employee_education_history_mapper.go  # Education mappers
│   └── usecase/
│       └── employee_usecase.go             # Education methods added to EmployeeUsecase
└── presentation/
    ├── handler/
    │   └── employee_handler.go             # Education handler methods
    └── router/
        └── employee_routers.go             # Education routes as sub-resources
```

### Frontend (React/Next.js)

```
apps/web/src/features/master-data/employee/
├── types/index.d.ts                        # Education types added
├── services/employee-service.ts            # Education API methods added
├── hooks/use-employees.ts                  # Education query/mutation hooks added
├── i18n/
│   ├── en.ts                               # Education translations (EN)
│   └── id.ts                               # Education translations (ID)
└── components/
    ├── employee-detail-modal.tsx            # Updated: Education info + tab
    └── education/
        ├── index.ts                        # Barrel export
        ├── education-info-card.tsx          # Overview tab: latest education (read-only)
        ├── education-timeline.tsx           # Education History tab: timeline with actions
        ├── create-education-dialog.tsx      # Create dialog
        ├── edit-education-dialog.tsx        # Edit dialog
        └── delete-education-dialog.tsx      # Delete confirmation dialog
```

---

## Migration Notes

- Migrated from standalone HRD module (`apps/api/internal/hrd/`) to organization module
- Previous standalone page `/hrd/education` has been removed
- Previous `education_history.*` permissions removed from seeder (now uses `employee.read`/`employee.update`/`employee.delete`)
- Database table `employee_education_histories` remains unchanged (same table, different model package)
- Follows same sub-resource pattern as Employee Contracts
