# Modules Documentation

## CRM Healthcare/Pharmaceutical Platform - Sales CRM Modules

**Versi**: 2.0  
**Status**: Active  
**Last Updated**: 2025-01-15  
**Product Type**: Sales CRM untuk Perusahaan Farmasi

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Module Architecture](#module-architecture)
3. [Core Modules](#core-modules)
4. [Module Relationships](#module-relationships)
5. [Pages & Routes](#pages--routes)
6. [Data Models](#data-models)
7. [API Endpoints](#api-endpoints)

---

## Overview

Dokumen ini menjelaskan semua modules yang akan diimplementasikan dalam **Sales CRM untuk Perusahaan Farmasi**. Setiap module memiliki pages, components, services, dan relasi dengan modules lainnya.

**Platform**: Web Application (Next.js 16) + Mobile App (Flutter)

### Module Structure

Setiap module mengikuti struktur folder berikut:

```
apps/web/src/features/<moduleName>/
├── types/           # Type definitions
├── stores/          # Zustand state management
├── hooks/           # Custom React hooks
├── services/        # API services
├── components/      # UI components
│   ├── ui/          # Pure UI components
│   └── containers/ # Container components with state
└── messages/        # i18n translations (en, id)
```

---

## Module Architecture

### Module Categories

1. **Core Modules**: Authentication, User Management, Settings
2. **Sales CRM Modules**: Account & Contact, Visit Report, Sales Pipeline, Task & Reminder, Product
3. **Analytics**: Dashboard, Reports

### Platform Support

- **Web Application**: Semua modules
- **Mobile App**: Account & Contact, Visit Report, Task & Reminder, Dashboard (basic)

---

## Core Modules

### 1. Authentication Module (`auth`)

**Purpose**: Handle user authentication and session management

**Pages**:

- `/login` - Login page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification

**Components**:

- `LoginForm` - Login form component
- `PasswordResetForm` - Password reset form
- `AuthGuard` - Route protection component

**Services**:

- `authService.login()`
- `authService.logout()`
- `authService.refreshToken()`
- `authService.requestPasswordReset()`
- `authService.resetPassword()`

**Store**:

- `useAuthStore` - Current user, token, session state

**Relationships**:

- → User Module (user profile)
- → All modules (authentication required)

---

### 2. User Management Module (`users`)

**Purpose**: Manage system users, roles, and permissions

**Pages**:

- `/users` - User list
- `/users/new` - Create new user
- `/users/[id]` - User detail/edit
- `/users/[id]/permissions` - Manage user permissions

**Components**:

- `UserList` - User list table
- `UserForm` - Create/edit user form
- `UserRoleSelector` - Role assignment component
- `PermissionMatrix` - Permission management

**Services**:

- `userService.list()`
- `userService.getById()`
- `userService.create()`
- `userService.update()`
- `userService.delete()`
- `userService.updatePermissions()`

**Store**:

- `useUserStore` - User list, current user, permissions

**Relationships**:

- ← Authentication Module
- → All modules (user context)

---

### 3. Settings Module (`settings`)

**Purpose**: System configuration and settings

**Pages**:

- `/settings` - Settings dashboard
- `/settings/general` - General settings (company info, logo, branding)
- `/settings/notifications` - Notification preferences
- `/settings/pipeline` - Pipeline stages configuration

**Components**:

- `SettingsNav` - Settings navigation
- `GeneralSettingsForm` - General settings form
- `NotificationSettingsForm` - Notification settings
- `PipelineSettingsForm` - Pipeline stages configuration

**Services**:

- `settingsService.getSettings()`
- `settingsService.updateSettings()`

**Store**:

- `useSettingsStore` - System settings

**Relationships**:

- → All modules (settings affect all operations)

---

## Sales CRM Modules

### 4. Account & Contact Management Module (`accounts`)

**Purpose**: Manage accounts (Rumah Sakit, Klinik, Apotek) dan contacts (Dokter, PIC, Manager)

**Pages (Web)**:

- `/accounts` - Account list
- `/accounts/new` - Create new account
- `/accounts/[id]` - Account detail/edit
- `/accounts/[id]/contacts` - Account contacts
- `/contacts` - Contact list
- `/contacts/new` - Create new contact
- `/contacts/[id]` - Contact detail/edit

**Pages (Mobile)**:

- `/accounts` - Account list
- `/accounts/[id]` - Account detail
- `/contacts` - Contact list
- `/contacts/[id]` - Contact detail

**Components (Web)**:

- `AccountList` - Account list table dengan search & filter
- `AccountForm` - Create/edit account form
- `AccountDetail` - Account detail view
- `ContactList` - Contact list table
- `ContactForm` - Create/edit contact form
- `ContactDetail` - Contact detail view
- `AccountSelector` - Account selector (untuk form lain)
- `ContactSelector` - Contact selector (untuk form lain)

**Components (Mobile)**:

- `AccountListScreen` - Account list dengan search
- `AccountDetailScreen` - Account detail
- `ContactListScreen` - Contact list
- `ContactDetailScreen` - Contact detail

**Services**:

- `accountService.list()`
- `accountService.getById()`
- `accountService.create()`
- `accountService.update()`
- `accountService.delete()`
- `accountService.search()`
- `contactService.list()`
- `contactService.getById()`
- `contactService.create()`
- `contactService.update()`
- `contactService.delete()`
- `contactService.search()`

**Store**:

- `useAccountStore` - Account list, current account
- `useContactStore` - Contact list, current contact

**Data Models**:

```typescript
interface Account {
  id: string;
  name: string;
  category: "hospital" | "clinic" | "pharmacy";
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  assignedTo?: string; // Sales rep ID
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  accountId: string;
  name: string;
  role: "doctor" | "pic" | "manager" | "other";
  phone?: string;
  email?: string;
  position?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Visit Report Module (visit reports linked ke account)
- → Sales Pipeline Module (deals linked ke account)
- → Task Module (tasks linked ke account/contact)

---

### 5. Visit Report & Activity Tracking Module (`visit-reports`)

**Purpose**: Track sales visits dengan check-in/out, GPS, dan dokumentasi foto

**Pages (Web)**:

- `/visit-reports` - Visit report list
- `/visit-reports/new` - Create new visit report
- `/visit-reports/[id]` - Visit report detail
- `/visit-reports/[id]/review` - Supervisor review page
- `/accounts/[id]/activities` - Account activity timeline

**Pages (Mobile)**:

- `/visit-reports` - Visit report list
- `/visit-reports/new` - Create visit report dengan GPS & foto
- `/visit-reports/[id]` - Visit report detail

**Components (Web)**:

- `VisitReportList` - Visit report list dengan filter
- `VisitReportForm` - Create/edit visit report form
- `VisitReportDetail` - Visit report detail view
- `ActivityTimeline` - Activity timeline component
- `PhotoUpload` - Photo upload component
- `SupervisorReview` - Supervisor review component (approve/reject)

**Components (Mobile)**:

- `VisitReportListScreen` - Visit report list
- `VisitReportFormScreen` - Create visit report dengan GPS & camera
- `VisitReportDetailScreen` - Visit report detail
- `CheckInOutButton` - Check-in/out button dengan GPS

**Services**:

- `visitReportService.list()`
- `visitReportService.getById()`
- `visitReportService.create()`
- `visitReportService.update()`
- `visitReportService.checkIn()`
- `visitReportService.checkOut()`
- `visitReportService.approve()`
- `visitReportService.reject()`
- `visitReportService.uploadPhoto()`
- `activityService.getTimeline()`

**Store**:

- `useVisitReportStore` - Visit report list, current visit report
- `useActivityStore` - Activity timeline

**Data Models**:

```typescript
interface VisitReport {
  id: string;
  accountId: string;
  contactId?: string;
  salesRepId: string;
  visitDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  purpose: string;
  notes?: string;
  photos?: string[]; // Photo URLs
  status: "draft" | "submitted" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: "visit" | "call" | "email" | "task" | "deal";
  accountId?: string;
  contactId?: string;
  userId: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Relationships**:

- ← Account Module (visit report linked ke account)
- ← Contact Module (visit report linked ke contact)
- → Activity Module (visit report creates activity)

---

### 6. Sales Pipeline Module (`pipeline`)

**Purpose**: Manage sales pipeline dari lead hingga deal

**Pages (Web)**:

- `/pipeline` - Pipeline kanban view
- `/deals` - Deal list
- `/deals/new` - Create new deal
- `/deals/[id]` - Deal detail/edit

**Pages (Mobile)**:

- (Optional untuk MVP) - Basic deal list

**Components (Web)**:

- `PipelineKanban` - Kanban board untuk pipeline
- `DealCard` - Deal card component
- `DealForm` - Create/edit deal form
- `DealDetail` - Deal detail view
- `PipelineSummary` - Pipeline summary widget
- `ForecastWidget` - Forecast widget

**Services**:

- `pipelineService.getPipeline()`
- `pipelineService.getSummary()`
- `pipelineService.getForecast()`
- `dealService.list()`
- `dealService.getById()`
- `dealService.create()`
- `dealService.update()`
- `dealService.delete()`
- `dealService.move()`

**Store**:

- `usePipelineStore` - Pipeline data, deals
- `useDealStore` - Deal list, current deal

**Data Models**:

```typescript
interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
}

interface Deal {
  id: string;
  accountId: string;
  contactId?: string;
  salesRepId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate?: string;
  probability: number; // 0-100
  products?: DealProduct[];
  notes?: string;
  status: "open" | "won" | "lost";
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Fields to be added in Sprint 2 (Dev2):
  nextStep?: string; // Next action/step for the deal
  lastInteractedOn?: string; // Last interaction date (from Activity module)
  progressToWon?: number; // Progress percentage to won stage
}

interface DealProduct {
  productId: string;
  quantity: number;
  price: number;
}
```

**Sales Funnel Report**:

- Currently displays placeholder data for deal details
- **Fields that need to be added in Sprint 2 (Dev2)**:
  - `GET /api/v1/deals` - Endpoint to fetch individual deals
  - `next_step` - Next action/step for each deal
  - `last_interacted_on` - Last interaction date (from Activity module)
  - `progress_to_won` - Calculated progress percentage based on stage and probability
  - Deal value by stage (for Insights chart)
  - Conversion rates between stages
  - Time in stage metrics
  - Forecast accuracy (expected vs actual close dates)

**Relationships**:

- ← Account Module (deal linked ke account)
- ← Contact Module (deal linked ke contact)
- ← Product Module (deal linked ke products)

---

### 7. Task & Reminder Module (`tasks`)

**Purpose**: Manage tasks dan reminders untuk follow-up

**Pages (Web)**:

- `/tasks` - Task list
- `/tasks/new` - Create new task
- `/tasks/[id]` - Task detail/edit

**Pages (Mobile)**:

- `/tasks` - Task list
- `/tasks/new` - Create new task
- `/tasks/[id]` - Task detail

**Components (Web)**:

- `TaskList` - Task list dengan filter
- `TaskForm` - Create/edit task form
- `TaskCard` - Task card component
- `TaskDetail` - Task detail view

**Components (Mobile)**:

- `TaskListScreen` - Task list
- `TaskFormScreen` - Create task form
- `TaskDetailScreen` - Task detail
- `TaskReminderNotification` - Push notification untuk reminder

**Services**:

- `taskService.list()`
- `taskService.getById()`
- `taskService.create()`
- `taskService.update()`
- `taskService.delete()`
- `taskService.assign()`
- `taskService.complete()`
- `taskService.getReminders()`

**Store**:

- `useTaskStore` - Task list, current task

**Data Models**:

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  accountId?: string;
  contactId?: string;
  assignedTo: string;
  assignedBy: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in-progress" | "done" | "cancelled";
  reminderAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- ← Account Module (task linked ke account)
- ← Contact Module (task linked ke contact)

---

### 8. Product Management Module (`products`)

**Purpose**: Manage product catalog

**Pages (Web)**:

- `/products` - Product list
- `/products/new` - Create new product
- `/products/[id]` - Product detail/edit

**Pages (Mobile)**:

- (Optional untuk MVP) - Basic product list

**Components (Web)**:

- `ProductList` - Product list dengan search
- `ProductForm` - Create/edit product form
- `ProductDetail` - Product detail view
- `ProductSelector` - Product selector (untuk deal form)

**Services**:

- `productService.list()`
- `productService.getById()`
- `productService.create()`
- `productService.update()`
- `productService.delete()`
- `productService.search()`

**Store**:

- `useProductStore` - Product list, current product

**Data Models**:

```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Sales Pipeline Module (products linked ke deals)

---

### 9. Dashboard Module (`dashboard`)

**Purpose**: Dashboard dengan key metrics dan analytics

**Pages (Web)**:

- `/dashboard` - Main dashboard

**Pages (Mobile)**:

- `/dashboard` - Basic dashboard

**Components (Web)**:

- `DashboardOverview` - Overview widget
- `VisitStatistics` - Visit statistics widget
- `PipelineSummary` - Pipeline summary widget
- `TopAccounts` - Top accounts widget
- `TopSalesRep` - Top sales rep widget
- `RecentActivities` - Recent activities widget
- `Charts` - Various charts (recharts atau similar)

**Components (Mobile)**:

- `DashboardScreen` - Basic dashboard dengan key metrics
- `VisitStatsWidget` - Visit statistics
- `RecentActivitiesWidget` - Recent activities

**Services**:

- `dashboardService.getOverview()`
- `dashboardService.getVisitStats()`
- `dashboardService.getPipelineSummary()`
- `dashboardService.getTopAccounts()`
- `dashboardService.getTopSalesRep()`
- `dashboardService.getRecentActivities()`

**Store**:

- `useDashboardStore` - Dashboard data

**Relationships**:

- ← All modules (dashboard aggregates data dari semua modules)

---

### 10. Reports Module (`reports`)

**Purpose**: Generate reports untuk sales activities

**Pages (Web)**:

- `/reports` - Reports list
- `/reports/visit-reports` - Visit report report
- `/reports/pipeline` - Pipeline report
- `/reports/sales-performance` - Sales performance report
- `/reports/account-activity` - Account activity report

**Pages (Mobile)**:

- (Optional untuk MVP)

**Components (Web)**:

- `ReportGenerator` - Report generator component
- `ReportViewer` - Report viewer component
- `DateRangePicker` - Date range picker
- `ReportFilters` - Report filters component
- `ExportButton` - Export to PDF/Excel
- `SalesFunnelViewer` - Sales Funnel viewer with 2 tabs (Table + Insights)
- `SalesFunnelTable` - Sales Funnel table view with deal details
- `SalesFunnelInsights` - Sales Funnel insights with charts and metrics

**Services**:

- `reportService.generateVisitReport()`
- `reportService.generatePipelineReport()`
- `reportService.generateSalesPerformanceReport()`
- `reportService.generateAccountActivityReport()`
- `reportService.export()`

**Store**:

- `useReportStore` - Report data

**Relationships**:

- ← All modules (reports aggregate data dari semua modules)

---

## Legacy Modules (ARCHIVED)

> **Note**: Modules berikut di-archive karena tidak relevan untuk Sales CRM:
>
> - Diagnosis & Procedures (dapat digunakan sebagai optional module di future)
> - Patient Management
> - Doctor Management
> - Appointment Scheduling
> - Medical Records
> - Prescription Management
> - Medication Management
> - Inventory Management
> - Purchase Management
> - Transaction Management

---

## Module Relationships

```
Authentication
    ↓
User Management
    ↓
Account & Contact ←→ Visit Report ←→ Sales Pipeline
    ↓                    ↓                ↓
    └────────────────────┴────────────────┘
                         ↓
                    Task & Reminder
                         ↓
                    Product Management
                         ↓
                    Dashboard & Reports
                         ↓
                    Settings
```

---

## API Endpoints Summary

### Web APIs

- `/api/v1/auth/*` - Authentication
- `/api/v1/users/*` - User management
- `/api/v1/accounts/*` - Account management
- `/api/v1/contacts/*` - Contact management
- `/api/v1/visit-reports/*` - Visit report management
- `/api/v1/activities/*` - Activity tracking
- `/api/v1/pipelines/*` - Pipeline management
- `/api/v1/deals/*` - Deal management
- `/api/v1/tasks/*` - Task management
- `/api/v1/products/*` - Product management
- `/api/v1/dashboard/*` - Dashboard data
- `/api/v1/reports/*` - Reports
- `/api/v1/settings/*` - Settings

### Mobile APIs

- Same as Web APIs, dengan beberapa endpoints yang dioptimize untuk mobile
- `/api/v1/mobile/visit-reports/check-in` - Check-in dengan GPS
- `/api/v1/mobile/visit-reports/check-out` - Check-out dengan GPS
- `/api/v1/mobile/visit-reports/upload-photo` - Photo upload
- `/api/v1/mobile/tasks/reminders` - Task reminders

---

**Dokumen ini akan diupdate sesuai dengan progress development.**
**Purpose**: Manage medical procedures/tindakan

**Pages**:

- `/master-data/procedures` - Procedure list
- `/master-data/procedures/new` - Add procedure
- `/master-data/procedures/[id]` - Procedure detail

**Components**:

- `ProcedureList` - Procedure list
- `ProcedureForm` - Add/edit procedure form
- `ProcedureSelector` - Procedure selector

**Services**:

- `procedureService.list()`
- `procedureService.getById()`
- `procedureService.create()`
- `procedureService.update()`
- `procedureService.search()`

**Data Model**:

```typescript
interface Procedure {
  id: string;
  code: string; // Procedure code
  name: string;
  nameEn?: string;
  category?: string;
  description?: string;
  duration?: number; // minutes
  price?: number; // Optional pricing
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Medical Record Module (used in treatment plans)
- → Transaction Module (if transaction recording is needed)

---

#### 4.3 Insurance Provider Master (`insurance-providers`)

**Purpose**: Manage insurance providers (BPJS, private insurance)

**Pages**:

- `/master-data/insurance-providers` - Insurance provider list
- `/master-data/insurance-providers/new` - Add insurance provider
- `/master-data/insurance-providers/[id]` - Insurance provider detail

**Components**:

- `InsuranceProviderList` - Insurance provider list
- `InsuranceProviderForm` - Add/edit form
- `InsuranceProviderSelector` - Insurance provider selector

**Services**:

- `insuranceProviderService.list()`
- `insuranceProviderService.getById()`
- `insuranceProviderService.create()`
- `insuranceProviderService.update()`

**Data Model**:

```typescript
interface InsuranceProvider {
  id: string;
  code: string; // e.g., "BPJS", "PRIVATE_001"
  name: string;
  type: "bpjs" | "private" | "corporate";
  apiEndpoint?: string; // For BPJS integration
  apiKey?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Patient Module (patients can have insurance)

---

#### 4.4 Location Master (`locations`)

**Purpose**: Manage physical locations (pharmacy, warehouse, clinic rooms)

**Pages**:

- `/master-data/locations` - Location list
- `/master-data/locations/new` - Add location
- `/master-data/locations/[id]` - Location detail

**Components**:

- `LocationList` - Location list
- `LocationForm` - Add/edit location form
- `LocationSelector` - Location selector

**Services**:

- `locationService.list()`
- `locationService.getById()`
- `locationService.create()`
- `locationService.update()`

**Data Model**:

```typescript
interface Location {
  id: string;
  code: string;
  name: string;
  type: "pharmacy" | "warehouse" | "clinic" | "room";
  address?: Address;
  phone?: string;
  email?: string;
  managerId?: string; // User ID of location manager
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Inventory Module (stock per location)
- → Appointment Module (appointments at location)

---

#### 4.5 Category Master (`categories`)

**Purpose**: Manage categories for medications

**Pages**:

- `/master-data/categories` - Category list
- `/master-data/categories/new` - Add category
- `/master-data/categories/[id]` - Category detail

**Components**:

- `CategoryList` - Category list (tree view if hierarchical)
- `CategoryForm` - Add/edit category form
- `CategorySelector` - Category selector

**Services**:

- `categoryService.list()`
- `categoryService.getById()`
- `categoryService.create()`
- `categoryService.update()`

**Data Model**:

```typescript
interface Category {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  parentId?: string; // For hierarchical categories
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Medication Module (medications belong to category)

---

#### 4.6 Unit Master (`units`)

**Purpose**: Manage measurement units (tablet, bottle, ml, mg, etc.)

**Pages**:

- `/master-data/units` - Unit list
- `/master-data/units/new` - Add unit
- `/master-data/units/[id]` - Unit detail

**Components**:

- `UnitList` - Unit list
- `UnitForm` - Add/edit unit form
- `UnitSelector` - Unit selector

**Services**:

- `unitService.list()`
- `unitService.getById()`
- `unitService.create()`
- `unitService.update()`

**Data Model**:

```typescript
interface Unit {
  id: string;
  code: string; // e.g., "TAB", "BTL", "ML", "MG"
  name: string; // e.g., "Tablet", "Bottle", "Milliliter", "Milligram"
  nameEn?: string;
  type: "count" | "weight" | "volume" | "length";
  baseUnit?: string; // For conversions
  conversionFactor?: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Medication Module (medications use units)

---

#### 4.7 Supplier Master (`suppliers`)

**Purpose**: Manage suppliers/vendors for medications

**Pages**:

- `/master-data/suppliers` - Supplier list
- `/master-data/suppliers/new` - Add supplier
- `/master-data/suppliers/[id]` - Supplier detail

**Components**:

- `SupplierList` - Supplier list
- `SupplierForm` - Add/edit supplier form
- `SupplierSelector` - Supplier selector

**Services**:

- `supplierService.list()`
- `supplierService.getById()`
- `supplierService.create()`
- `supplierService.update()`

**Data Model**:

```typescript
interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: Address;
  taxId?: string; // NPWP
  paymentTerms?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Purchase Module (purchases from suppliers)

---

**Store**:

- `useMasterDataStore` - All master data (diagnosis, procedures, etc.)

**Relationships**:

- → All modules (master data used throughout system)

---

## Patient Management Modules

### 5. Patient Module (`patients`)

**Purpose**: Manage patient registration, profiles, and data

**Pages**:

- `/patients` - Patient list
- `/patients/new` - Register new patient
- `/patients/[id]` - Patient detail/profile
- `/patients/[id]/medical-history` - Medical history
- `/patients/[id]/appointments` - Patient appointments
- `/patients/[id]/prescriptions` - Patient prescriptions
- `/patients/[id]/transactions` - Patient transaction history

**Components**:

- `PatientList` - Patient list with search/filter
- `PatientForm` - Patient registration/edit form
- `PatientProfile` - Patient profile view
- `PatientMedicalHistory` - Medical history timeline
- `PatientSearch` - Quick patient search

**Services**:

- `patientService.list()`
- `patientService.getById()`
- `patientService.create()`
- `patientService.update()`
- `patientService.search()`
- `patientService.getMedicalHistory()`
- `patientService.getAppointments()`
- `patientService.getPrescriptions()`

**Store**:

- `usePatientStore` - Patient list, current patient, search state

**Data Model**:

```typescript
interface Patient {
  id: string;
  nik?: string; // Nomor Induk Kependudukan
  bpjsNumber?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  phone: string;
  email?: string;
  address: Address;
  emergencyContact: EmergencyContact;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  insuranceProviders?: InsuranceProvider[];
  photoUrl?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Appointment Module (has many appointments)
- → Medical Record Module (has many medical records)
- → Prescription Module (has many prescriptions)
- → Transaction Module (has many transactions)
- ← User Module (created by, updated by)

---

## Healthcare Operations Modules

### 6. Doctor Module (`doctors`)

**Purpose**: Manage doctor/physician profiles and information

**Pages**:

- `/doctors` - Doctor list
- `/doctors/new` - Register new doctor
- `/doctors/[id]` - Doctor detail/profile
- `/doctors/[id]/schedule` - Doctor schedule management
- `/doctors/[id]/appointments` - Doctor appointments

**Components**:

- `DoctorList` - Doctor list
- `DoctorForm` - Doctor registration/edit form
- `DoctorProfile` - Doctor profile view
- `DoctorSchedule` - Schedule management
- `DoctorAvailability` - Availability calendar

**Services**:

- `doctorService.list()`
- `doctorService.getById()`
- `doctorService.create()`
- `doctorService.update()`
- `doctorService.getSchedule()`
- `doctorService.updateSchedule()`
- `doctorService.getAvailability()`

**Store**:

- `useDoctorStore` - Doctor list, current doctor, schedules

**Data Model**:

```typescript
interface Doctor {
  id: string;
  strNumber: string; // Surat Tanda Registrasi
  firstName: string;
  lastName: string;
  specialization: string[];
  phone: string;
  email: string;
  schedule: Schedule[];
  status: "active" | "inactive";
  userId?: string; // Link to user account
  createdAt: string;
  updatedAt: string;
}
```

**Relationships**:

- → Appointment Module (has many appointments)
- → Medical Record Module (creates medical records)
- → Prescription Module (creates prescriptions)
- ← User Module (linked to user account)

---

### 7. Appointment Module (`appointments`)

**Purpose**: Manage appointment scheduling and booking

**Pages**:

- `/appointments` - Appointment list/calendar
- `/appointments/new` - Book new appointment
- `/appointments/[id]` - Appointment detail
- `/appointments/calendar` - Calendar view
- `/appointments/today` - Today's appointments

**Components**:

- `AppointmentList` - Appointment list
- `AppointmentCalendar` - Calendar view
- `AppointmentForm` - Book/edit appointment form
- `AppointmentCard` - Appointment card component
- `AppointmentStatusBadge` - Status indicator
- `TimeSlotSelector` - Time slot picker

**Services**:

- `appointmentService.list()`
- `appointmentService.getById()`
- `appointmentService.create()`
- `appointmentService.update()`
- `appointmentService.cancel()`
- `appointmentService.reschedule()`
- `appointmentService.getAvailableSlots()`
- `appointmentService.sendReminder()`

**Store**:

- `useAppointmentStore` - Appointment list, calendar state, filters

**Data Model**:

```typescript
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number; // minutes
  type: "consultation" | "follow-up" | "emergency" | "check-up";
  status:
    | "scheduled"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "no-show";
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  patient: Patient;
  doctor: Doctor;
}
```

**Relationships**:

- ← Patient Module (belongs to patient)
- ← Doctor Module (belongs to doctor)
- → Medical Record Module (creates medical record)
- ← User Module (created by receptionist)

---

### 8. Medical Record Module (`medical-records`)

**Purpose**: Manage patient medical records and history

**Pages**:

- `/medical-records` - Medical records list
- `/medical-records/new` - Create new medical record
- `/medical-records/[id]` - Medical record detail
- `/patients/[patientId]/medical-records` - Patient's medical records

**Components**:

- `MedicalRecordList` - Medical records list
- `MedicalRecordForm` - Create/edit medical record form
- `MedicalRecordDetail` - Medical record detail view
- `MedicalRecordTimeline` - Timeline view
- `ChiefComplaintInput` - Chief complaint input
- `PhysicalExamForm` - Physical examination form
- `DiagnosisSelector` - Diagnosis selection
- `TreatmentPlanEditor` - Treatment plan editor
- `FileUploader` - Upload lab results, X-ray, etc.

**Services**:

- `medicalRecordService.list()`
- `medicalRecordService.getById()`
- `medicalRecordService.create()`
- `medicalRecordService.update()`
- `medicalRecordService.getByPatient()`
- `medicalRecordService.uploadFile()`

**Store**:

- `useMedicalRecordStore` - Medical records list, current record

**Data Model**:

```typescript
interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  chiefComplaint: string;
  physicalExamination: PhysicalExamination;
  diagnosis: Diagnosis[];
  treatmentPlan: TreatmentPlan;
  notes?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  patient: Patient;
  doctor: Doctor;
  appointment?: Appointment;
}

interface PhysicalExamination {
  vitalSigns: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  generalAppearance?: string;
  examinationNotes?: string;
}

interface Diagnosis {
  code: string; // ICD-10 code
  description: string;
  type: "primary" | "secondary";
}

interface TreatmentPlan {
  medications?: string[];
  procedures?: string[];
  followUpDate?: string;
  instructions?: string;
}
```

**Relationships**:

- ← Patient Module (belongs to patient)
- ← Doctor Module (created by doctor)
- ← Appointment Module (linked to appointment)
- → Prescription Module (may create prescription)
- ← User Module (created by doctor)

---

### 9. Prescription Module (`prescriptions`)

**Purpose**: Manage prescription creation and processing

**Pages**:

- `/prescriptions` - Prescription list
- `/prescriptions/new` - Create new prescription
- `/prescriptions/[id]` - Prescription detail
- `/prescriptions/pending` - Pending prescriptions (pharmacist view)
- `/patients/[patientId]/prescriptions` - Patient's prescriptions

**Components**:

- `PrescriptionList` - Prescription list
- `PrescriptionForm` - Create prescription form
- `PrescriptionDetail` - Prescription detail view
- `MedicationSelector` - Medication selection with search
- `DosageInput` - Dosage, frequency, duration input
- `DrugInteractionChecker` - Drug interaction validation
- `PrescriptionProcessor` - Pharmacist processing view
- `PrescriptionLabel` - Printable prescription label

**Services**:

- `prescriptionService.list()`
- `prescriptionService.getById()`
- `prescriptionService.create()`
- `prescriptionService.update()`
- `prescriptionService.process()` // Pharmacist processing
- `prescriptionService.fulfill()`
- `prescriptionService.cancel()`
- `prescriptionService.checkDrugInteractions()`
- `prescriptionService.checkStockAvailability()`

**Store**:

- `usePrescriptionStore` - Prescription list, current prescription

**Data Model**:

```typescript
interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicalRecordId?: string;
  medications: PrescriptionMedication[];
  notes?: string;
  status: "pending" | "processing" | "fulfilled" | "cancelled" | "partial";
  processedBy?: string; // Pharmacist user ID
  processedAt?: string;
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
  patient: Patient;
  doctor: Doctor;
  medicalRecord?: MedicalRecord;
}

interface PrescriptionMedication {
  medicationId: string;
  medicationName: string;
  dosage: string; // e.g., "500mg"
  frequency: string; // e.g., "2x daily"
  duration: string; // e.g., "7 days"
  quantity: number;
  instructions?: string;
  stockAvailable: boolean;
  drugInteractions?: DrugInteraction[];
}
```

**Relationships**:

- ← Patient Module (belongs to patient)
- ← Doctor Module (created by doctor)
- ← Medical Record Module (linked to medical record)
- → Inventory Module (checks stock, reduces stock on fulfillment)
- ← User Module (created by doctor, processed by pharmacist)

---

## Pharmacy Operations Modules

### 10. Medication Module (`medications`)

**Purpose**: Manage medication/medicine master data

**Pages**:

- `/medications` - Medication list
- `/medications/new` - Add new medication
- `/medications/[id]` - Medication detail
- `/medications/[id]/stock` - Medication stock by location

**Components**:

- `MedicationList` - Medication list with search
- `MedicationForm` - Add/edit medication form
- `MedicationDetail` - Medication detail view
- `BarcodeScanner` - Barcode scanning component
- `BPOMValidator` - BPOM registration validator

**Services**:

- `medicationService.list()`
- `medicationService.getById()`
- `medicationService.create()`
- `medicationService.update()`
- `medicationService.search()`
- `medicationService.scanBarcode()`
- `medicationService.validateBPOM()`

**Store**:

- `useMedicationStore` - Medication list, current medication

**Data Model**:

```typescript
interface Medication {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  bpomNumber: string; // BPOM registration number
  barcode?: string;
  category: string;
  unit: string; // e.g., "tablet", "bottle", "box"
  purchasePrice: number;
  sellingPrice: number;
  stock: StockInfo[];
  status: "active" | "inactive" | "discontinued";
  createdAt: string;
  updatedAt: string;
}

interface StockInfo {
  locationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number; // For pending prescriptions
  availableQuantity: number; // quantity - reservedQuantity
  minStockLevel: number;
  maxStockLevel: number;
  expiryDate?: string;
  batchNumber?: string;
}
```

**Relationships**:

- → Inventory Module (has stock)
- → Prescription Module (used in prescriptions)
- → Purchase Module (purchased from suppliers)

---

### 11. Inventory Module (`inventory`)

**Purpose**: Manage stock movements and inventory operations

**Pages**:

- `/inventory` - Inventory dashboard
- `/inventory/stock` - Stock list by location
- `/inventory/movements` - Stock movement history
- `/inventory/adjustments` - Stock adjustments
- `/inventory/transfers` - Stock transfers between locations
- `/inventory/alerts` - Low stock & expiry alerts

**Components**:

- `InventoryDashboard` - Inventory overview
- `StockList` - Stock list with filters
- `StockMovementList` - Movement history
- `StockAdjustmentForm` - Stock adjustment form
- `StockTransferForm` - Transfer form
- `StockAlertList` - Alerts list
- `StockLevelIndicator` - Visual stock level indicator

**Services**:

- `inventoryService.getStock()`
- `inventoryService.getStockByLocation()`
- `inventoryService.getMovements()`
- `inventoryService.adjustStock()`
- `inventoryService.transferStock()`
- `inventoryService.getAlerts()`
- `inventoryService.checkStockAvailability()`

**Store**:

- `useInventoryStore` - Stock data, movements, alerts

**Data Model**:

```typescript
interface StockMovement {
  id: string;
  medicationId: string;
  locationId: string;
  type: "in" | "out" | "adjustment" | "transfer" | "sale" | "purchase";
  quantity: number; // Positive for 'in', negative for 'out'
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: "prescription" | "purchase" | "adjustment" | "transfer";
  referenceId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  medication: Medication;
  location: Location;
}
```

**Relationships**:

- ← Medication Module (tracks stock for medications)
- → Prescription Module (reduces stock on fulfillment)
- → Purchase Module (increases stock on purchase)
- ← Location Module (stock per location)

---

### 12. Purchase Module (`purchases`)

**Purpose**: Manage purchase orders and supplier management

**Pages**:

- `/purchases` - Purchase order list
- `/purchases/new` - Create purchase order
- `/purchases/[id]` - Purchase order detail
- `/purchases/receipts` - Goods receipt processing
- `/suppliers` - Supplier list
- `/suppliers/new` - Add supplier

**Components**:

- `PurchaseOrderList` - PO list
- `PurchaseOrderForm` - Create/edit PO form
- `GoodsReceiptForm` - Goods receipt form
- `SupplierList` - Supplier list
- `SupplierForm` - Supplier form

**Services**:

- `purchaseService.list()`
- `purchaseService.getById()`
- `purchaseService.create()`
- `purchaseService.update()`
- `purchaseService.receiveGoods()`
- `supplierService.list()`
- `supplierService.create()`
- `supplierService.update()`

**Store**:

- `usePurchaseStore` - Purchase orders, suppliers

**Data Model**:

```typescript
interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderNumber: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: "draft" | "sent" | "confirmed" | "received" | "cancelled";
  expectedDeliveryDate?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
}

interface PurchaseOrderItem {
  medicationId: string;
  medicationName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
}
```

**Relationships**:

- → Supplier Module (purchased from supplier)
- → Medication Module (purchases medications)
- → Inventory Module (increases stock on receipt)
- ← User Module (created by admin/pharmacist)

---

## Transaction Modules

### 13. Transaction Module (`transactions`)

**Purpose**: Simple transaction recording for internal use (simplified billing for single company)

**Note**: Since this is an internal system for a single company, we use a simplified transaction model instead of complex invoicing/billing. This records transactions for services and medications.

**Pages**:

- `/transactions` - Transaction list
- `/transactions/new` - Record new transaction
- `/transactions/[id]` - Transaction detail

**Components**:

- `TransactionList` - Transaction list
- `TransactionForm` - Record transaction form
- `TransactionDetail` - Transaction detail view
- `TransactionReceipt` - Simple receipt view/print

**Services**:

- `transactionService.list()`
- `transactionService.getById()`
- `transactionService.create()`
- `transactionService.update()`
- `transactionService.printReceipt()`

**Store**:

- `useTransactionStore` - Transactions list

**Data Model**:

```typescript
interface Transaction {
  id: string;
  transactionNumber: string;
  patientId: string;
  appointmentId?: string;
  prescriptionId?: string;
  items: TransactionItem[];
  total: number;
  paymentMethod: "cash" | "transfer" | "bpjs" | "insurance";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  patient: Patient;
  appointment?: Appointment;
  prescription?: Prescription;
}

interface TransactionItem {
  type: "service" | "medication" | "procedure";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  medicationId?: string;
  procedureId?: string;
}
```

**Relationships**:

- ← Patient Module (transaction for patient)
- ← Appointment Module (transaction for appointment)
- ← Prescription Module (transaction for prescription)
- ← User Module (created by staff)

---

## Analytics Modules

### 14. Dashboard Module (`dashboard`)

**Purpose**: Provide overview and key metrics

**Pages**:

- `/dashboard` - Main dashboard
- `/dashboard/appointments` - Appointment analytics
- `/dashboard/revenue` - Revenue analytics
- `/dashboard/inventory` - Inventory analytics

**Components**:

- `DashboardOverview` - Main dashboard view
- `AppointmentStats` - Appointment statistics
- `RevenueChart` - Revenue charts
- `TopDoctors` - Top performing doctors
- `TopMedications` - Top selling medications
- `InventoryAlerts` - Inventory alerts summary
- `QuickActions` - Quick action buttons

**Services**:

- `dashboardService.getOverview()`
- `dashboardService.getAppointmentStats()`
- `dashboardService.getRevenueStats()`
- `dashboardService.getInventoryStats()`
- `dashboardService.getTopDoctors()`
- `dashboardService.getTopMedications()`

**Store**:

- `useDashboardStore` - Dashboard data, filters, date range

**Relationships**:

- Aggregates data from all modules

---

### 15. Reports Module (`reports`)

**Purpose**: Generate and export reports

**Pages**:

- `/reports` - Reports list
- `/reports/patients` - Patient reports
- `/reports/appointments` - Appointment reports
- `/reports/sales` - Sales reports
- `/reports/inventory` - Inventory reports
- `/reports/financial` - Financial reports

**Components**:

- `ReportList` - Available reports list
- `ReportGenerator` - Report generation form
- `ReportViewer` - Report viewer
- `ReportExporter` - Export to PDF/Excel
- `DateRangePicker` - Date range selection
- `ReportFilters` - Report filters

**Services**:

- `reportService.list()`
- `reportService.generate()`
- `reportService.export()`
- `reportService.getPatientReport()`
- `reportService.getAppointmentReport()`
- `reportService.getSalesReport()`
- `reportService.getInventoryReport()`
- `reportService.getFinancialReport()`

**Store**:

- `useReportStore` - Report data, filters, export state

**Relationships**:

- Aggregates data from all modules

---

## Module Relationships Diagram

```
┌─────────────┐
│   Auth      │
│  Module     │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
┌──────▼──────┐                   ┌──────▼──────┐
│    User     │                   │  Settings  │
│  Module     │                   │  Module    │
└──────┬──────┘                   └────────────┘
       │
       │
┌──────▼──────────────────────────────────────────┐
│            Patient Module                        │
└──────┬──────────────────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ Appointment │ │   Medical   │ │Prescription │ │ Transaction │
│   Module    │ │   Record    │ │   Module    │ │   Module    │
└──────┬──────┘ │   Module    │ └──────┬──────┘ └─────────────┘
       │        └──────────────┘        │
       │                                │
       │                        ┌───────▼───────┐
       │                        │  Medication  │
       │                        │   Module     │
       │                        └──────┬───────┘
       │                                │
       │                        ┌───────▼───────┐
       │                        │  Inventory    │
       │                        │   Module      │
       │                        └──────┬───────┘
       │                                │
       │                        ┌───────▼───────┐
       │                        │   Purchase   │
       │                        │   Module     │
       │                        └──────────────┘
       │
┌──────▼──────┐
│   Doctor    │
│  Module     │
└─────────────┘

┌─────────────────────────────────────────┐
│         Master Data Module              │
│  (Diagnosis, Procedures, Insurance,    │
│   Locations, Categories, Units,        │
│   Suppliers)                            │
└──────┬──────────────────────────────────┘
       │
       └────────→ Used by all modules
```

---

## Pages & Routes

### Route Structure

```
/                          → Dashboard
/login                     → Login
/forgot-password           → Password Reset
/reset-password            → Reset Password Form

/users                     → User List
/users/new                 → Create User
/users/[id]                → User Detail
/users/[id]/permissions    → User Permissions

/patients                  → Patient List
/patients/new              → Register Patient
/patients/[id]             → Patient Profile
/patients/[id]/medical-history → Medical History
/patients/[id]/appointments → Patient Appointments
/patients/[id]/prescriptions → Patient Prescriptions
/patients/[id]/transactions → Patient Transactions

/doctors                   → Doctor List
/doctors/new               → Register Doctor
/doctors/[id]              → Doctor Profile
/doctors/[id]/schedule     → Doctor Schedule
/doctors/[id]/appointments → Doctor Appointments

/appointments              → Appointment List
/appointments/new          → Book Appointment
/appointments/[id]         → Appointment Detail
/appointments/calendar     → Calendar View
/appointments/today        → Today's Appointments

/medical-records           → Medical Records List
/medical-records/new       → Create Medical Record
/medical-records/[id]      → Medical Record Detail

/prescriptions             → Prescription List
/prescriptions/new         → Create Prescription
/prescriptions/[id]        → Prescription Detail
/prescriptions/pending     → Pending Prescriptions

/medications               → Medication List
/medications/new          → Add Medication
/medications/[id]         → Medication Detail
/medications/[id]/stock    → Medication Stock

/inventory                 → Inventory Dashboard
/inventory/stock           → Stock List
/inventory/movements       → Stock Movements
/inventory/adjustments     → Stock Adjustments
/inventory/transfers       → Stock Transfers
/inventory/alerts          → Stock Alerts

/purchases                 → Purchase Order List
/purchases/new             → Create Purchase Order
/purchases/[id]            → Purchase Order Detail
/purchases/receipts        → Goods Receipts
/suppliers                 → Supplier List
/suppliers/new             → Add Supplier

/transactions              → Transaction List
/transactions/new          → Record Transaction
/transactions/[id]         → Transaction Detail

/master-data/diagnosis     → Diagnosis Master
/master-data/diagnosis/new → Add Diagnosis
/master-data/diagnosis/[id] → Diagnosis Detail
/master-data/procedures    → Procedure Master
/master-data/procedures/new → Add Procedure
/master-data/procedures/[id] → Procedure Detail
/master-data/insurance-providers → Insurance Provider Master
/master-data/insurance-providers/new → Add Insurance Provider
/master-data/locations     → Location Master
/master-data/locations/new → Add Location
/master-data/categories    → Category Master
/master-data/categories/new → Add Category
/master-data/units         → Unit Master
/master-data/units/new     → Add Unit
/master-data/suppliers     → Supplier Master
/master-data/suppliers/new → Add Supplier

/dashboard                 → Main Dashboard
/dashboard/appointments     → Appointment Analytics
/dashboard/revenue          → Revenue Analytics
/dashboard/inventory        → Inventory Analytics

/reports                   → Reports List
/reports/patients          → Patient Reports
/reports/appointments       → Appointment Reports
/reports/sales             → Sales Reports
/reports/inventory         → Inventory Reports
/reports/financial         → Financial Reports

/settings                  → Settings Dashboard
/settings/general          → General Settings
/settings/notifications    → Notification Settings
/settings/payments         → Payment Settings
/settings/taxes            → Tax Settings
```

---

## Data Models Summary

### Core Entities

1. **User** - System users (admin, doctor, pharmacist, receptionist, cashier)
2. **Patient** - Patients/patients
3. **Doctor** - Doctors/physicians
4. **Appointment** - Scheduled appointments
5. **MedicalRecord** - Patient medical records
6. **Prescription** - Prescriptions
7. **Medication** - Medicine master data
8. **StockMovement** - Inventory movements
9. **PurchaseOrder** - Purchase orders
10. **Transaction** - Simple transaction records (internal)
11. **Master Data Entities**:
    - **Diagnosis** - Diagnosis codes (ICD-10)
    - **Procedure** - Medical procedures/tindakan
    - **InsuranceProvider** - Insurance providers (BPJS, private)
    - **Location** - Physical locations (pharmacy, warehouse, clinic)
    - **Category** - Medication categories
    - **Unit** - Measurement units
    - **Supplier** - Suppliers/vendors

### Key Relationships

- **Patient** has many **Appointments**
- **Patient** has many **MedicalRecords**
- **Patient** has many **Prescriptions**
- **Patient** has many **Transactions**
- **Doctor** has many **Appointments**
- **Doctor** creates **MedicalRecords**
- **Doctor** creates **Prescriptions**
- **Appointment** may create **MedicalRecord**
- **MedicalRecord** may create **Prescription**
- **Prescription** uses **Medications**
- **Prescription** reduces **Stock**
- **PurchaseOrder** increases **Stock**
- **Transaction** is for **Patient**
- **Transaction** may be for **Appointment** or **Prescription**
- **Master Data** is referenced by multiple modules

---

## API Endpoints Summary

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Users

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PUT /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `PUT /api/v1/users/:id/permissions`

### Patients

- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `POST /api/v1/patients`
- `PUT /api/v1/patients/:id`
- `GET /api/v1/patients/:id/medical-history`
- `GET /api/v1/patients/:id/appointments`
- `GET /api/v1/patients/:id/prescriptions`

### Doctors

- `GET /api/v1/doctors`
- `GET /api/v1/doctors/:id`
- `POST /api/v1/doctors`
- `PUT /api/v1/doctors/:id`
- `GET /api/v1/doctors/:id/schedule`
- `PUT /api/v1/doctors/:id/schedule`
- `GET /api/v1/doctors/:id/availability`

### Appointments

- `GET /api/v1/appointments`
- `GET /api/v1/appointments/:id`
- `POST /api/v1/appointments`
- `PUT /api/v1/appointments/:id`
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/reschedule`
- `GET /api/v1/appointments/available-slots`

### Medical Records

- `GET /api/v1/medical-records`
- `GET /api/v1/medical-records/:id`
- `POST /api/v1/medical-records`
- `PUT /api/v1/medical-records/:id`
- `GET /api/v1/medical-records/patient/:patientId`

### Prescriptions

- `GET /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions`
- `PUT /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions/:id/process`
- `POST /api/v1/prescriptions/:id/fulfill`
- `POST /api/v1/prescriptions/check-interactions`

### Medications

- `GET /api/v1/medications`
- `GET /api/v1/medications/:id`
- `POST /api/v1/medications`
- `PUT /api/v1/medications/:id`
- `GET /api/v1/medications/:id/stock`

### Inventory

- `GET /api/v1/inventory/stock`
- `GET /api/v1/inventory/movements`
- `POST /api/v1/inventory/adjustments`
- `POST /api/v1/inventory/transfers`
- `GET /api/v1/inventory/alerts`

### Purchases

- `GET /api/v1/purchases`
- `GET /api/v1/purchases/:id`
- `POST /api/v1/purchases`
- `PUT /api/v1/purchases/:id`
- `POST /api/v1/purchases/:id/receive`

### Transactions

- `GET /api/v1/transactions`
- `GET /api/v1/transactions/:id`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/:id`
- `GET /api/v1/transactions/:id/receipt`

### Master Data

- `GET /api/v1/master-data/diagnosis`
- `GET /api/v1/master-data/diagnosis/:id`
- `POST /api/v1/master-data/diagnosis`
- `PUT /api/v1/master-data/diagnosis/:id`
- `GET /api/v1/master-data/procedures`
- `GET /api/v1/master-data/procedures/:id`
- `POST /api/v1/master-data/procedures`
- `PUT /api/v1/master-data/procedures/:id`
- `GET /api/v1/master-data/insurance-providers`
- `GET /api/v1/master-data/insurance-providers/:id`
- `POST /api/v1/master-data/insurance-providers`
- `PUT /api/v1/master-data/insurance-providers/:id`
- `GET /api/v1/master-data/locations`
- `GET /api/v1/master-data/locations/:id`
- `POST /api/v1/master-data/locations`
- `PUT /api/v1/master-data/locations/:id`
- `GET /api/v1/master-data/categories`
- `GET /api/v1/master-data/categories/:id`
- `POST /api/v1/master-data/categories`
- `PUT /api/v1/master-data/categories/:id`
- `GET /api/v1/master-data/units`
- `GET /api/v1/master-data/units/:id`
- `POST /api/v1/master-data/units`
- `PUT /api/v1/master-data/units/:id`
- `GET /api/v1/master-data/suppliers`
- `GET /api/v1/master-data/suppliers/:id`
- `POST /api/v1/master-data/suppliers`
- `PUT /api/v1/master-data/suppliers/:id`

### Dashboard

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/appointments`
- `GET /api/v1/dashboard/revenue`
- `GET /api/v1/dashboard/inventory`

### Reports

- `GET /api/v1/reports/patients`
- `GET /api/v1/reports/appointments`
- `GET /api/v1/reports/sales`
- `GET /api/v1/reports/inventory`
- `GET /api/v1/reports/financial`
- `GET /api/v1/reports/export`

---

## Implementation Priority

### Phase 1: MVP Core (Months 1-2)

1. Authentication Module
2. User Management Module
3. Settings Module
4. Master Data Module (Diagnosis, Procedures, Insurance, Locations, Categories, Units, Suppliers)
5. Patient Module
6. Doctor Module
7. Appointment Module

### Phase 2: Healthcare Operations (Month 2-3)

8. Medical Record Module
9. Prescription Module
10. Dashboard Module

### Phase 3: Pharmacy & Transactions (Month 3)

11. Medication Module
12. Inventory Module
13. Transaction Module (simplified)
14. Reports Module

### Phase 4: Enhancement (Month 4+)

15. Purchase Module
16. Advanced Reports
17. Integrations (BPJS, if needed)

---

**Dokumen ini akan diupdate sesuai dengan perkembangan development dan perubahan requirements.**
