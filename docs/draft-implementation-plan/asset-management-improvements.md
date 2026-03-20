# Asset Management Improvement Plan

## Overview

This document outlines the remaining improvements for the Asset Management module in GIMS ERP. The **Asset Budget Management (CAPEX Planning)** has been completed, and these are the next four improvements to implement.

---

## 1. Asset Maintenance Module

### Description

Track preventive maintenance schedules, repairs, and spare parts inventory for fixed assets.

### Business Value

- Extend asset lifespan through scheduled maintenance
- Reduce unexpected downtime
- Track maintenance costs for better budgeting
- Manage spare parts inventory

### Key Features

#### Preventive Maintenance

- Create maintenance schedules (daily, weekly, monthly, yearly)
- Automatic work order generation based on schedules
- Track maintenance history per asset
- Maintenance reminder notifications

#### Corrective Maintenance (Repairs)

- Work order management for repairs
- Track repair costs and downtime
- Vendor/contractor management for repairs
- Attach photos and documents to repair records

#### Spare Parts Inventory

- Track spare parts stock levels
- Link spare parts to specific assets
- Reorder point alerts
- Usage history tracking

### Database Schema

```sql
-- Maintenance Schedules
CREATE TABLE asset_maintenance_schedules (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES fixed_assets(id),
    schedule_type VARCHAR(20), -- preventive, corrective
    frequency VARCHAR(20), -- daily, weekly, monthly, yearly, custom
    frequency_value INTEGER,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    description TEXT,
    estimated_cost DECIMAL(15,2),
    assigned_to UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Orders
CREATE TABLE asset_work_orders (
    id UUID PRIMARY KEY,
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID REFERENCES fixed_assets(id),
    schedule_id UUID REFERENCES asset_maintenance_schedules(id),
    wo_type VARCHAR(20), -- preventive, corrective, emergency
    status VARCHAR(20), -- open, in_progress, completed, cancelled
    priority VARCHAR(10), -- low, medium, high, critical
    description TEXT,
    planned_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES employees(id),
    actual_cost DECIMAL(15,2),
    downtime_hours DECIMAL(8,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spare Parts
CREATE TABLE asset_spare_parts (
    id UUID PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    unit_of_measure VARCHAR(20),
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    reorder_point INTEGER,
    current_stock INTEGER DEFAULT 0,
    unit_cost DECIMAL(15,2),
    supplier_id UUID REFERENCES contacts(id),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset-Spare Parts Link
CREATE TABLE asset_spare_part_links (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES fixed_assets(id),
    spare_part_id UUID REFERENCES asset_spare_parts(id),
    quantity_per_asset INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order - Spare Parts Usage
CREATE TABLE work_order_spare_parts (
    id UUID PRIMARY KEY,
    work_order_id UUID REFERENCES asset_work_orders(id),
    spare_part_id UUID REFERENCES asset_spare_parts(id),
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint                                   | Description                 |
| ------ | ------------------------------------------ | --------------------------- |
| GET    | /api/v1/maintenance/schedules              | List maintenance schedules  |
| POST   | /api/v1/maintenance/schedules              | Create maintenance schedule |
| GET    | /api/v1/maintenance/schedules/:id          | Get schedule detail         |
| PUT    | /api/v1/maintenance/schedules/:id          | Update schedule             |
| DELETE | /api/v1/maintenance/schedules/:id          | Delete schedule             |
| GET    | /api/v1/maintenance/work-orders            | List work orders            |
| POST   | /api/v1/maintenance/work-orders            | Create work order           |
| GET    | /api/v1/maintenance/work-orders/:id        | Get work order detail       |
| PUT    | /api/v1/maintenance/work-orders/:id        | Update work order           |
| PUT    | /api/v1/maintenance/work-orders/:id/status | Update work order status    |
| GET    | /api/v1/maintenance/spare-parts            | List spare parts            |
| POST   | /api/v1/maintenance/spare-parts            | Create spare part           |
| GET    | /api/v1/maintenance/spare-parts/:id        | Get spare part detail       |
| PUT    | /api/v1/maintenance/spare-parts/:id        | Update spare part           |
| GET    | /api/v1/maintenance/alerts                 | Get maintenance alerts      |

### UI Components

- **Maintenance Dashboard** - Overview of upcoming maintenance, overdue items, costs
- **Schedule Calendar** - Visual calendar view of maintenance schedules
- **Work Order List** - Table with filters for status, priority, type
- **Work Order Form** - Create/edit work orders with spare parts selection
- **Spare Parts Inventory** - Stock levels, reorder alerts
- **Asset Maintenance History** - Timeline of all maintenance activities

### Permissions

- `asset_maintenance.read` - View maintenance data
- `asset_maintenance.create` - Create schedules and work orders
- `asset_maintenance.update` - Update maintenance records
- `asset_maintenance.delete` - Delete maintenance records
- `asset_maintenance.approve` - Approve work orders

---

## 2. Multi-Book Accounting

### Description

Support multiple depreciation books (Financial vs Tax) with different depreciation methods for compliance and reporting.

### Business Value

- Comply with different accounting standards (GAAP, IFRS, Tax regulations)
- Generate reports for different stakeholders (investors, tax authorities)
- Track temporary and permanent differences
- Simplify tax filing and financial reporting

### Key Features

#### Multiple Books

- Financial Book (GAAP/IFRS compliant)
- Tax Book (Tax authority regulations)
- Custom Books (Management reporting, etc.)

#### Different Depreciation Methods per Book

- Financial Book: Straight-line, Declining balance, Units of production
- Tax Book: Accelerated depreciation as per tax laws
- Independent useful lives and salvage values per book

#### Reconciliation

- Track differences between books
- Deferred tax asset/liability calculation
- Automatic journal entries for differences

### Database Schema

```sql
-- Depreciation Books
CREATE TABLE depreciation_books (
    id UUID PRIMARY KEY,
    book_code VARCHAR(20) UNIQUE NOT NULL,
    book_name VARCHAR(100) NOT NULL,
    book_type VARCHAR(20), -- financial, tax, management
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Books Link
CREATE TABLE fixed_asset_books (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES fixed_assets(id),
    book_id UUID REFERENCES depreciation_books(id),
    depreciation_method VARCHAR(20), -- straight_line, declining_balance, sum_of_years, units_of_production
    useful_life_years INTEGER,
    useful_life_months INTEGER,
    salvage_value DECIMAL(15,2),
    depreciation_rate DECIMAL(5,2),
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    current_book_value DECIMAL(15,2),
    last_depreciation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, book_id)
);

-- Depreciation Entries per Book
CREATE TABLE depreciation_entries (
    id UUID PRIMARY KEY,
    asset_book_id UUID REFERENCES fixed_asset_books(id),
    period_year INTEGER,
    period_month INTEGER,
    depreciation_amount DECIMAL(15,2),
    accumulated_depreciation DECIMAL(15,2),
    book_value DECIMAL(15,2),
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book Differences
CREATE TABLE asset_book_differences (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES fixed_assets(id),
    financial_book_id UUID REFERENCES depreciation_books(id),
    tax_book_id UUID REFERENCES depreciation_books(id),
    period_year INTEGER,
    period_month INTEGER,
    financial_depreciation DECIMAL(15,2),
    tax_depreciation DECIMAL(15,2),
    temporary_difference DECIMAL(15,2),
    deferred_tax_amount DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint                               | Description                 |
| ------ | -------------------------------------- | --------------------------- |
| GET    | /api/v1/depreciation-books             | List depreciation books     |
| POST   | /api/v1/depreciation-books             | Create book                 |
| GET    | /api/v1/depreciation-books/:id         | Get book detail             |
| PUT    | /api/v1/depreciation-books/:id         | Update book                 |
| GET    | /api/v1/fixed-assets/:id/books         | Get asset books             |
| POST   | /api/v1/fixed-assets/:id/books         | Add book to asset           |
| PUT    | /api/v1/fixed-assets/:id/books/:bookId | Update asset book           |
| POST   | /api/v1/depreciation/run               | Run depreciation for period |
| GET    | /api/v1/depreciation/reports           | Get depreciation reports    |
| GET    | /api/v1/depreciation/differences       | Get book differences        |

### UI Components

- **Depreciation Books Management** - Configure multiple books
- **Asset Book Assignment** - Assign books to assets with different parameters
- **Depreciation Run** - Process depreciation for selected period and books
- **Book Comparison Report** - Side-by-side comparison of books
- **Deferred Tax Report** - Calculate deferred tax assets/liabilities
- **Depreciation Schedule** - Monthly/yearly depreciation projections

### Permissions

- `depreciation_books.read` - View depreciation books
- `depreciation_books.manage` - Create/update books
- `depreciation.run` - Execute depreciation process
- `depreciation.reports` - View depreciation reports

---

## 3. CIP Management (Construction in Progress)

### Description

Track assets under construction, capitalize costs, and handle interest capitalization during construction period.

### Business Value

- Track costs during construction phase
- Automate interest capitalization calculations
- Smooth transition from CIP to Fixed Asset
- Accurate asset valuation at completion

### Key Features

#### CIP Project Tracking

- Create CIP projects for assets under construction
- Track multiple costs: materials, labor, overhead, contractor fees
- Allocate indirect costs to CIP projects
- Progress tracking and milestone management

#### Interest Capitalization

- Calculate avoidable interest during construction
- Support weighted average accumulated expenditures
- Generate interest capitalization journal entries
- Handle multiple funding sources

#### CIP to Asset Transfer

- Transfer completed CIP to Fixed Asset
- Allocate total costs to asset components
- Automatic depreciation start date calculation
- Historical cost tracking

### Database Schema

```sql
-- CIP Projects
CREATE TABLE cip_projects (
    id UUID PRIMARY KEY,
    project_code VARCHAR(50) UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_category_id UUID REFERENCES fixed_asset_categories(id),
    location_id UUID REFERENCES locations(id),
    department_id UUID REFERENCES departments(id),
    planned_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(20), -- planning, in_progress, completed, cancelled
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    interest_capitalization_enabled BOOLEAN DEFAULT false,
    capitalization_rate DECIMAL(8,5), -- Weighted average interest rate
    total_capitalized_interest DECIMAL(15,2) DEFAULT 0,
    responsible_employee_id UUID REFERENCES employees(id),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIP Cost Transactions
CREATE TABLE cip_cost_transactions (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES cip_projects(id),
    transaction_date DATE NOT NULL,
    cost_type VARCHAR(30), -- materials, labor, overhead, contractor, interest, other
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(100),
    document_url TEXT,
    vendor_id UUID REFERENCES contacts(id),
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interest Capitalization Calculations
CREATE TABLE cip_interest_capitalization (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES cip_projects(id),
    calculation_period DATE NOT NULL,
    weighted_average_expenditures DECIMAL(15,2),
    specific_borrowing_interest DECIMAL(15,2),
    general_borrowing_applied DECIMAL(15,2),
    capitalization_rate DECIMAL(8,5),
    avoidable_interest DECIMAL(15,2),
    actual_interest_cost DECIMAL(15,2),
    capitalized_amount DECIMAL(15,2),
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIP to Asset Transfer
CREATE TABLE cip_asset_transfers (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES cip_projects(id),
    fixed_asset_id UUID REFERENCES fixed_assets(id),
    transfer_date DATE NOT NULL,
    total_project_cost DECIMAL(15,2),
    cost_allocation_method VARCHAR(20), -- percentage, component, equal
    notes TEXT,
    transferred_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIP Transfer Components (for multi-component assets)
CREATE TABLE cip_transfer_components (
    id UUID PRIMARY KEY,
    transfer_id UUID REFERENCES cip_asset_transfers(id),
    component_name VARCHAR(255),
    allocated_cost DECIMAL(15,2),
    percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint                                    | Description                   |
| ------ | ------------------------------------------- | ----------------------------- |
| GET    | /api/v1/cip/projects                        | List CIP projects             |
| POST   | /api/v1/cip/projects                        | Create CIP project            |
| GET    | /api/v1/cip/projects/:id                    | Get project detail            |
| PUT    | /api/v1/cip/projects/:id                    | Update project                |
| PUT    | /api/v1/cip/projects/:id/status             | Update project status         |
| GET    | /api/v1/cip/projects/:id/costs              | Get project costs             |
| POST   | /api/v1/cip/projects/:id/costs              | Add cost transaction          |
| GET    | /api/v1/cip/projects/:id/interest           | Get interest calculations     |
| POST   | /api/v1/cip/projects/:id/interest-calculate | Calculate interest for period |
| POST   | /api/v1/cip/projects/:id/transfer           | Transfer CIP to Fixed Asset   |
| GET    | /api/v1/cip/reports/cost-summary            | CIP cost summary report       |

### UI Components

- **CIP Projects List** - Active and completed projects
- **CIP Project Form** - Create/edit projects with interest settings
- **Cost Entry** - Add various cost types to project
- **Interest Capitalization Calculator** - Calculate and record avoidable interest
- **Progress Tracker** - Visual progress bar with milestones
- **Transfer to Asset Wizard** - Step-by-step transfer process
- **CIP Reports** - Cost breakdown, interest summary, aging

### Permissions

- `cip.read` - View CIP projects
- `cip.create` - Create CIP projects
- `cip.update` - Update project details
- `cip.delete` - Delete CIP projects
- `cip.costs.manage` - Add/edit cost transactions
- `cip.interest.calculate` - Calculate interest capitalization
- `cip.transfer` - Transfer CIP to Fixed Asset

---

## 4. Asset Impairment

### Description

Asset impairment testing and journal entries based on IAS 36 (IFRS) or ASC 360 (GAAP).

### Business Value

- Comply with accounting standards for asset impairment
- Ensure accurate asset valuations
- Proper timing of impairment recognition
- Audit trail for impairment decisions

### Key Features

#### Impairment Testing

- Indicators assessment (external and internal)
- Recoverable amount calculation (higher of FVLCTS and VIU)
- CGU (Cash Generating Unit) level testing
- Automatic impairment loss calculation

#### Impairment Journal Entries

- Generate impairment journal entries
- Track impairment reversals (if allowed)
- Post-impairment depreciation adjustment
- Disclosure notes generation

#### Reporting

- Impairment testing worksheet
- Impairment loss summary
- CGU allocation reports
- Sensitivity analysis

### Database Schema

```sql
-- Impairment Tests
CREATE TABLE asset_impairment_tests (
    id UUID PRIMARY KEY,
    test_date DATE NOT NULL,
    asset_id UUID REFERENCES fixed_assets(id),
    cgu_id UUID REFERENCES cash_generating_units(id),
    test_type VARCHAR(20), -- individual, cgu
    indicator_description TEXT,
    carrying_amount DECIMAL(15,2) NOT NULL,
    fair_value_less_costs_to_sell DECIMAL(15,2),
    value_in_use DECIMAL(15,2),
    recoverable_amount DECIMAL(15,2),
    impairment_loss DECIMAL(15,2),
    is_impaired BOOLEAN DEFAULT false,
    impairment_percentage DECIMAL(5,2),
    tested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Generating Units
CREATE TABLE cash_generating_units (
    id UUID PRIMARY KEY,
    cgu_code VARCHAR(50) UNIQUE NOT NULL,
    cgu_name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id UUID REFERENCES business_segments(id),
    location_id UUID REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CGU Assets Link
CREATE TABLE cgu_assets (
    id UUID PRIMARY KEY,
    cgu_id UUID REFERENCES cash_generating_units(id),
    asset_id UUID REFERENCES fixed_assets(id),
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cgu_id, asset_id)
);

-- Impairment Journal Entries
CREATE TABLE impairment_journal_entries (
    id UUID PRIMARY KEY,
    impairment_test_id UUID REFERENCES asset_impairment_tests(id),
    journal_entry_id UUID REFERENCES journal_entries(id),
    entry_type VARCHAR(20), -- impairment, reversal
    amount DECIMAL(15,2),
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impairment Reversals
CREATE TABLE impairment_reversals (
    id UUID PRIMARY KEY,
    original_test_id UUID REFERENCES asset_impairment_tests(id),
    reversal_date DATE NOT NULL,
    reversal_amount DECIMAL(15,2),
    new_recoverable_amount DECIMAL(15,2),
    reason TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Value in Use Calculations
CREATE TABLE value_in_use_calculations (
    id UUID PRIMARY KEY,
    impairment_test_id UUID REFERENCES asset_impairment_tests(id),
    projection_years INTEGER DEFAULT 5,
    discount_rate DECIMAL(8,5),
    terminal_growth_rate DECIMAL(8,5),
    total_present_value DECIMAL(15,2),
    calculation_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIU Cash Flow Projections
CREATE TABLE viu_cash_flow_projections (
    id UUID PRIMARY KEY,
    viu_calculation_id UUID REFERENCES value_in_use_calculations(id),
    year_number INTEGER,
    projected_revenue DECIMAL(15,2),
    projected_costs DECIMAL(15,2),
    projected_cash_flow DECIMAL(15,2),
    present_value_factor DECIMAL(10,8),
    present_value DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint                               | Description                  |
| ------ | -------------------------------------- | ---------------------------- |
| GET    | /api/v1/impairment/tests               | List impairment tests        |
| POST   | /api/v1/impairment/tests               | Create impairment test       |
| GET    | /api/v1/impairment/tests/:id           | Get test detail              |
| PUT    | /api/v1/impairment/tests/:id           | Update test                  |
| POST   | /api/v1/impairment/tests/:id/calculate | Calculate recoverable amount |
| POST   | /api/v1/impairment/tests/:id/approve   | Approve impairment           |
| GET    | /api/v1/impairment/cgus                | List CGUs                    |
| POST   | /api/v1/impairment/cgus                | Create CGU                   |
| GET    | /api/v1/impairment/cgus/:id            | Get CGU detail               |
| PUT    | /api/v1/impairment/cgus/:id            | Update CGU                   |
| POST   | /api/v1/impairment/cgus/:id/assets     | Add asset to CGU             |
| POST   | /api/v1/impairment/reversal            | Record impairment reversal   |
| GET    | /api/v1/impairment/reports/summary     | Impairment summary report    |
| GET    | /api/v1/impairment/reports/disclosure  | Disclosure report            |

### UI Components

- **Impairment Dashboard** - Overview of impaired assets, pending tests
- **Impairment Test Wizard** - Step-by-step testing workflow
- **CGU Management** - Create and manage cash generating units
- **Value in Use Calculator** - Input projections, calculate PV
- **Impairment Worksheet** - Detailed testing documentation
- **Impairment Journal Review** - Review and post entries
- **Disclosure Report** - Generate financial statement disclosures

### Permissions

- `impairment.read` - View impairment tests and data
- `impairment.create` - Create impairment tests
- `impairment.update` - Update impairment calculations
- `impairment.delete` - Delete draft tests
- `impairment.approve` - Approve impairment recognition
- `impairment.reverse` - Process impairment reversals
- `impairment.cgu.manage` - Manage CGUs

---

## Implementation Priority

### Recommended Order:

1. **Asset Maintenance** (High Priority)
   - Most practical daily use
   - High business value
   - Moderate complexity

2. **Multi-Book Accounting** (High Priority)
   - Critical for compliance
   - Required for proper financial reporting
   - Medium complexity

3. **CIP Management** (Medium Priority)
   - Important for construction companies
   - Complex interest calculations
   - Medium-High complexity

4. **Asset Impairment** (Medium Priority)
   - Annual requirement
   - Complex accounting standards
   - High complexity

### Effort Estimation (Rough)

| Module                | Backend  | Frontend | Total     |
| --------------------- | -------- | -------- | --------- |
| Asset Maintenance     | 3-4 days | 4-5 days | 7-9 days  |
| Multi-Book Accounting | 3-4 days | 3-4 days | 6-8 days  |
| CIP Management        | 4-5 days | 4-5 days | 8-10 days |
| Asset Impairment      | 4-5 days | 4-5 days | 8-10 days |

---

## Technical Notes

### Shared Components to Consider

1. **Calendar Component** - For maintenance schedules
2. **Timeline/History Component** - For audit trails
3. **Comparison Table** - For multi-book comparisons
4. **Wizard Framework** - For complex workflows (transfer, impairment testing)
5. **Chart Components** - For depreciation schedules, cost breakdowns

### Integration Points

- **General Ledger** - All modules post journal entries
- **Purchasing** - CIP links to POs and invoices
- **Inventory** - Spare parts integration
- **HR** - Employee assignments for maintenance
- **Reporting** - Custom reports for each module

### Testing Considerations

- Complex calculations (depreciation, interest) need unit tests
- Multi-book scenarios require comprehensive test data
- Impairment testing requires edge case coverage
- Maintenance schedules need date/time testing

---

## Related Documentation

- [Asset Budget Management](./asset-budget.md) - Already implemented
- [Fixed Asset Management](./fixed-assets.md) - Core module
- [General Ledger](../accounting/general-ledger.md) - Journal entries
- [API Standards](../../api-standart/README.md)
- [apptime Timezone Support](../../features/core/apptime-timezone-support.md)
