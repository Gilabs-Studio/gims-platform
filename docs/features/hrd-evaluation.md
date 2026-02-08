# HRD - Employee Evaluation Management

Fitur untuk mengelola evaluasi kinerja karyawan. Mendukung pembuatan template evaluasi (Evaluation Group + Criteria), pelaksanaan evaluasi per karyawan dengan scoring per kriteria, dan workflow status (DRAFT → SUBMITTED → REVIEWED → FINALIZED).

## Fitur Utama
- Template evaluasi (Evaluation Group) dengan kriteria berbobot
- Validasi total bobot kriteria ≤ 100%
- Evaluasi karyawan dengan scoring per kriteria
- Kalkulasi overall score otomatis: Σ(score × weight / 100)
- Support evaluasi SELF dan MANAGER
- Workflow status: DRAFT → SUBMITTED → REVIEWED → FINALIZED
- Form data endpoint untuk dropdown (employees, groups, types, statuses)
- Pagination, search, dan filter multi-parameter

## Business Rules
- Total weight semua criteria dalam satu group tidak boleh melebihi 100%
- Weight di-copy dari criteria ke evaluation criteria score saat evaluasi dibuat (snapshot at eval time)
- Overall score = Σ(score × weight / 100) untuk semua criteria scores
- Hanya evaluasi berstatus DRAFT yang bisa di-edit atau di-delete
- Status transition hanya valid: DRAFT → SUBMITTED → REVIEWED → FINALIZED
- Evaluasi tidak bisa di-submit tanpa criteria scores
- Evaluation group harus aktif (is_active=true) untuk bisa digunakan dalam evaluasi baru
- Period end harus setelah period start

## Keputusan Teknis
- **Mengapa weight di-copy ke evaluation criteria score**: 
  Agar perubahan weight di template tidak mengubah hasil evaluasi yang sudah ada. Trade-off: duplikasi data minimal.
  
- **Mengapa tidak ada REJECTED status**:
  Flow evaluasi bersifat one-way (forward-only). Jika reviewer tidak setuju, mereka bisa menambahkan notes dan tidak memajukan status. Trade-off: tidak bisa "return to draft".

- **Mengapa EmployeeEvaluationCriteria tidak pakai soft delete secara independen**:
  Criteria scores di-manage sebagai unit bersama evaluasi induknya. Delete/recreate saat update. Trade-off: slightly more writes, tapi simpler logic.

## Struktur Folder
```
internal/hrd/
├── data/
│   ├── models/
│   │   ├── evaluation_group.go           # EvaluationGroup model
│   │   ├── evaluation_criteria.go        # EvaluationCriteria model
│   │   └── employee_evaluation.go        # EmployeeEvaluation + EmployeeEvaluationCriteria
│   └── repositories/
│       ├── evaluation_group_repository.go          # Interface
│       ├── evaluation_group_repository_impl.go     # GORM implementation
│       ├── evaluation_criteria_repository.go       # Interface
│       ├── evaluation_criteria_repository_impl.go  # GORM implementation
│       ├── employee_evaluation_repository.go       # Interface
│       └── employee_evaluation_repository_impl.go  # GORM implementation
├── domain/
│   ├── dto/
│   │   └── evaluation_dto.go             # All evaluation DTOs
│   ├── mapper/
│   │   └── evaluation_mapper.go          # All evaluation mappers
│   └── usecase/
│       ├── evaluation_group_usecase.go           # Interface
│       ├── evaluation_group_usecase_impl.go      # Implementation
│       ├── evaluation_criteria_usecase.go        # Interface
│       ├── evaluation_criteria_usecase_impl.go   # Implementation
│       ├── employee_evaluation_usecase.go        # Interface
│       └── employee_evaluation_usecase_impl.go   # Implementation
└── presentation/
    ├── handler/
    │   ├── evaluation_group_handler.go
    │   ├── evaluation_criteria_handler.go
    │   └── employee_evaluation_handler.go
    ├── router/
    │   ├── evaluation_group_router.go
    │   ├── evaluation_criteria_router.go
    │   └── employee_evaluation_router.go
    └── routers.go                         # Domain aggregator (updated)
```

## API Endpoints

### Evaluation Groups

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/evaluation-groups` | evaluation.read | List all evaluation groups (paginated) |
| GET | `/hrd/evaluation-groups/:id` | evaluation.read | Get group by ID (with criteria) |
| POST | `/hrd/evaluation-groups` | evaluation.create | Create evaluation group |
| PUT | `/hrd/evaluation-groups/:id` | evaluation.update | Update evaluation group |
| DELETE | `/hrd/evaluation-groups/:id` | evaluation.delete | Delete evaluation group (soft) |

### Evaluation Criteria

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/evaluation-criteria/group/:group_id` | evaluation.read | Get criteria by group |
| GET | `/hrd/evaluation-criteria/:id` | evaluation.read | Get criteria by ID |
| POST | `/hrd/evaluation-criteria` | evaluation.create | Create criteria (validates weight) |
| PUT | `/hrd/evaluation-criteria/:id` | evaluation.update | Update criteria (validates weight) |
| DELETE | `/hrd/evaluation-criteria/:id` | evaluation.delete | Delete criteria (soft) |

### Employee Evaluations

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/employee-evaluations` | evaluation.read | List evaluations (paginated, filtered) |
| GET | `/hrd/employee-evaluations/:id` | evaluation.read | Get evaluation with full details |
| GET | `/hrd/employee-evaluations/form-data` | Auth | Get form dropdown data |
| POST | `/hrd/employee-evaluations` | evaluation.create | Create evaluation with scores |
| PUT | `/hrd/employee-evaluations/:id` | evaluation.update | Update evaluation (DRAFT only) |
| POST | `/hrd/employee-evaluations/:id/status` | evaluation.update | Transition status |
| DELETE | `/hrd/employee-evaluations/:id` | evaluation.delete | Delete evaluation (DRAFT only) |

## Cara Test Manual
1. Login sebagai admin/HR
2. **Create Evaluation Group**: POST `/hrd/evaluation-groups` dengan name "Performance Review FY25"
3. **Add Criteria**: POST `/hrd/evaluation-criteria` dengan evaluation_group_id, name "Communication", weight 30
4. **Add More Criteria**: Tambah criteria lain (total weight ≤ 100%)
5. **Verify Group**: GET `/hrd/evaluation-groups/:id` → should show group with all criteria
6. **Get Form Data**: GET `/hrd/employee-evaluations/form-data` → verify dropdowns
7. **Create Evaluation**: POST `/hrd/employee-evaluations` dengan employee_id, group_id, evaluator_id, criteria_scores
8. **Verify Score**: GET `/hrd/employee-evaluations/:id` → check overall_score calculation
9. **Submit**: POST `/hrd/employee-evaluations/:id/status` dengan status "SUBMITTED"
10. **Review**: POST `/hrd/employee-evaluations/:id/status` dengan status "REVIEWED"
11. **Finalize**: POST `/hrd/employee-evaluations/:id/status` dengan status "FINALIZED"
12. **Verify Edit Block**: Try PUT on finalized evaluation → should return error

## Automated Testing
- **Unit Tests**: `apps/api/internal/hrd/domain/usecase/evaluation_group_usecase_test.go`
- **Integration Tests**: `apps/api/test/hrd/evaluation_integration_test.go`

**Run Tests**:
```bash
cd apps/api && go test ./internal/hrd/...
```

## Dependencies
- **Backend**: GORM (models + queries), UUID (primary keys)
- **Integration**: Organization module (employee data via EmployeeRepository)
- **Database**: PostgreSQL with pg_trgm extension for GIN indexes

## Notes & Improvements
- **Known Limitation**: Saat ini belum support evaluation period templates (quarterly, annual auto-generation)
- **Future Improvement**: 
  - Add evaluation period templates for auto-scheduling
  - Add PDF export for finalized evaluations
  - Add notification system for pending reviews
  - Add dashboard with evaluation score trends
  - Add 360-degree evaluation support (PEER type)
- **Performance**: GIN indexes on evaluation_groups.name and evaluation_criteria.name for prefix search
