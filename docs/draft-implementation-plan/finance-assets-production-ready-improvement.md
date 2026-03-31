# Finance Assets Module - Production-Ready Improvement Plan

## Executive Summary

Modul Asset Management saat ini memiliki fondasi yang solid dengan fitur CRUD, depreciation tracking, dan asset actions (transfer, dispose, sell, revalue). Namun, untuk mencapai standar ERP production-ready, diperlukan penambahan fitur-fitur penting seperti asset master data lengkap, acquisition details, depreciation configuration, lifecycle management, attachments, assignment tracking, audit trail, dan advanced search/filter.

**Current Coverage**: ~60-70% dari fitur ERP standar
**Target Coverage**: 90-95% fitur production-ready
**Estimasi Timeline**: 4-6 minggu (dengan 1 developer full-time)

---

## Current State Analysis

### ✅ Sudah Implementasi

- [x] CRUD Asset dasar
- [x] Depreciation tracking (SL, DB, NONE)
- [x] Asset actions (depreciate, transfer, dispose, sell, revalue, adjust)
- [x] Transaction history dengan approval workflow
- [x] Asset categories & locations
- [x] Basic search & pagination
- [x] Permission integration
- [x] Modal detail view dengan tabs

### ❌ Belum Implementasi (Gap Analysis)

- [ ] Asset master data lengkap (serial number, barcode, asset tag)
- [ ] Acquisition details (supplier, PO reference, additional costs)
- [ ] Depreciation configuration per asset (override category defaults)
- [ ] Asset status lifecycle lengkap (draft, active, maintenance, disposed)
- [ ] File attachments (invoice, warranty, photos)
- [ ] Employee assignment dengan history
- [ ] Audit trail untuk semua perubahan
- [ ] Advanced search & filter
- [ ] Bulk operations (import, export, mass update)
- [ ] Asset component/parent-child relationships
- [ ] Warranty & insurance tracking
- [ ] Maintenance scheduling integration
- [ ] Reporting & analytics

---

## 1. Enhanced Asset Master Data

### 1.1 Extended Asset Interface

```typescript
// types/index.d.ts - Extensions

export interface Asset {
  // ... existing fields ...

  // NEW: Identitas Aset
  serial_number?: string; // Serial number unik
  barcode?: string; // Barcode untuk scanning
  qr_code?: string; // QR code URL/data
  asset_tag?: string; // Physical label/tag

  // NEW: Informasi Kepemilikan
  company_id: string; // Multi-company support
  company?: CompanyLite;
  business_unit_id?: string; // Business unit
  business_unit?: BusinessUnitLite;
  department_id?: string; // Department
  department?: DepartmentLite;
  assigned_to_employee_id?: string; // Assigned employee
  assigned_to_employee?: EmployeeLite;
  assignment_date?: string; // Tanggal assignment

  // NEW: Acquisition Details
  supplier_id?: string; // Supplier/vendor
  supplier?: ContactLite;
  purchase_order_id?: string; // Link ke PO
  purchase_order?: PurchaseOrderLite;
  supplier_invoice_id?: string; // Link ke invoice
  supplier_invoice?: SupplierInvoiceLite;
  acquisition_cost_breakdown: {
    base_price: number;
    shipping_cost: number;
    installation_cost: number;
    tax_amount: number;
    other_costs: number;
  };

  // NEW: Depreciation Configuration (override category)
  depreciation_config?: {
    method: "SL" | "DB" | "SYD" | "UOP" | "NONE";
    useful_life_months: number;
    useful_life_years: number;
    salvage_value: number;
    depreciation_rate: number; // For DB method
    start_date: string; // When depreciation begins
  };

  // NEW: Status & Lifecycle
  status: AssetStatus; // Extended enum
  lifecycle_stage:
    | "draft"
    | "pending_capitalization"
    | "active"
    | "in_use"
    | "under_maintenance"
    | "disposed"
    | "written_off";
  is_capitalized: boolean; // Sudah masuk GL?
  is_depreciable: boolean; // Bisa didepresiasi?
  is_fully_depreciated: boolean; // Nilai buku = salvage value?

  // NEW: Parent/Child Relationship
  parent_asset_id?: string; // For component assets
  parent_asset?: AssetLite;
  child_assets?: AssetLite[]; // Components
  is_parent: boolean; // Is this a composite asset?

  // NEW: Warranty & Insurance
  warranty?: {
    warranty_start: string;
    warranty_end: string;
    warranty_provider: string;
    warranty_terms: string;
  };
  insurance?: {
    insurance_policy_number: string;
    insurance_provider: string;
    insurance_start: string;
    insurance_end: string;
    insurance_value: number;
  };

  // NEW: Attachments
  attachments: AssetAttachment[];

  // NEW: Audit
  created_by_user: UserLite;
  updated_by_user?: UserLite;
  approved_by_user?: UserLite;
  approved_at?: string;

  // NEW: Metadata
  metadata?: Record<string, any>; // Custom fields
}

export type AssetStatus =
  | "draft" // Baru dibuat, belum diapprove
  | "pending_capitalization" // Menunggu kapitalisasi
  | "active" // Aktif, belum dipakai
  | "in_use" // Sedang dipakai
  | "under_maintenance" // Dalam perbaikan
  | "idle" // Menganggur
  | "disposed" // Dibuang
  | "sold" // Dijual
  | "written_off" // Dihapuskan
  | "transferred"; // Dipindahkan ke company lain

export interface AssetAttachment {
  id: string;
  asset_id: string;
  file_name: string;
  file_url: string;
  file_type: "invoice" | "warranty" | "photo" | "manual" | "other";
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
}

export interface AssetAuditLog {
  id: string;
  asset_id: string;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "depreciated"
    | "transferred"
    | "disposed"
    | "sold"
    | "revalued"
    | "assigned";
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  performed_by: UserLite;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}
```

### 1.2 Backend Schema Extensions

```sql
-- Asset extensions
ALTER TABLE fixed_assets
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id),
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS assigned_to_employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS assignment_date DATE,
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id),
ADD COLUMN IF NOT EXISTS supplier_invoice_id UUID REFERENCES supplier_invoices(id),
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_costs DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS useful_life_months INTEGER,
ADD COLUMN IF NOT EXISTS depreciation_start_date DATE,
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(30) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_capitalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_depreciable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_fully_depreciated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES fixed_assets(id),
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_start DATE,
ADD COLUMN IF NOT EXISTS warranty_end DATE,
ADD COLUMN IF NOT EXISTS warranty_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS insurance_start DATE,
ADD COLUMN IF NOT EXISTS insurance_end DATE,
ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Indexes untuk performa
CREATE INDEX idx_assets_serial ON fixed_assets(serial_number);
CREATE INDEX idx_assets_barcode ON fixed_assets(barcode);
CREATE INDEX idx_assets_company ON fixed_assets(company_id);
CREATE INDEX idx_assets_employee ON fixed_assets(assigned_to_employee_id);
CREATE INDEX idx_assets_lifecycle ON fixed_assets(lifecycle_stage);
CREATE INDEX idx_assets_parent ON fixed_assets(parent_asset_id);

-- Asset attachments table
CREATE TABLE asset_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('invoice', 'warranty', 'photo', 'manual', 'other')),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_attachments_asset ON asset_attachments(asset_id);

-- Asset audit log table
CREATE TABLE asset_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

CREATE INDEX idx_asset_audit_asset ON asset_audit_logs(asset_id);
CREATE INDEX idx_asset_audit_action ON asset_audit_logs(action);
CREATE INDEX idx_asset_audit_date ON asset_audit_logs(performed_at);

-- Assignment history
CREATE TABLE asset_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    returned_at TIMESTAMPTZ,
    return_reason TEXT,
    notes TEXT
);

CREATE INDEX idx_asset_assignment_asset ON asset_assignment_history(asset_id);
CREATE INDEX idx_asset_assignment_employee ON asset_assignment_history(employee_id);
```

---

## 2. Enhanced UI Components

### 2.1 Asset Detail View - Tab Structure

```
┌─────────────────────────────────────────────────────┐
│ Asset: Laptop Dell XPS 15 [AST-2024-00123]          │
├─────────────────────────────────────────────────────┤
│ [Overview] [Acquisition] [Depreciation] [Location]  │
│ [History] [Attachments] [Components] [Audit Log]    │
└─────────────────────────────────────────────────────┘
```

### 2.2 New Components to Create

```typescript
// components/asset-tabs/

export { AssetOverviewTab } from "./asset-overview-tab";
export { AssetAcquisitionTab } from "./asset-acquisition-tab";
export { AssetDepreciationConfigTab } from "./asset-depreciation-config-tab";
export { AssetLocationAssignmentTab } from "./asset-location-assignment-tab";
export { AssetHistoryTab } from "./asset-history-tab";
export { AssetAttachmentsTab } from "./asset-attachments-tab";
export { AssetComponentsTab } from "./asset-components-tab";
export { AssetAuditLogTab } from "./asset-audit-log-tab";

// components/forms/
export { AssetMasterDataForm } from "./asset-master-data-form";
export { AssetAcquisitionForm } from "./asset-acquisition-form";
export { AssetDepreciationConfigForm } from "./asset-depreciation-config-form";
export { AssetAssignmentForm } from "./asset-assignment-form";
export { AssetAttachmentUpload } from "./asset-attachment-upload";

// components/advanced/
export { AssetAdvancedSearch } from "./asset-advanced-search";
export { AssetBulkOperations } from "./asset-bulk-operations";
export { AssetBarcodeScanner } from "./asset-barcode-scanner";
export { AssetHierarchyTree } from "./asset-hierarchy-tree";
```

### 2.3 Asset Detail - Overview Tab Enhancement

```tsx
// components/asset-tabs/asset-overview-tab.tsx

export function AssetOverviewTab({ asset }: { asset: Asset }) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - Asset Identity */}
      <div className="col-span-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {asset.qr_code ? (
                <QRCode value={asset.qr_code} size={150} />
              ) : (
                <div className="bg-muted p-8 rounded-lg text-center">
                  <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No QR Code</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <InfoRow label="Asset Code" value={asset.code} />
              <InfoRow
                label="Serial Number"
                value={asset.serial_number || "-"}
              />
              <InfoRow label="Barcode" value={asset.barcode || "-"} />
              <InfoRow label="Asset Tag" value={asset.asset_tag || "-"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warranty & Insurance</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.warranty ? (
              <div className="space-y-2">
                <InfoRow
                  label="Warranty Period"
                  value={`${formatDate(asset.warranty.warranty_start)} - ${formatDate(asset.warranty.warranty_end)}`}
                />
                <InfoRow
                  label="Provider"
                  value={asset.warranty.warranty_provider}
                />
                <Badge
                  variant={isUnderWarranty(asset) ? "default" : "secondary"}
                >
                  {isUnderWarranty(asset)
                    ? "Under Warranty"
                    : "Warranty Expired"}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">No warranty information</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Column - Financial Summary */}
      <div className="col-span-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FinancialCard
                label="Acquisition Cost"
                value={asset.acquisition_cost}
                icon={ShoppingCart}
              />
              <FinancialCard
                label="Total Cost"
                value={calculateTotalCost(asset)}
                icon={Calculator}
              />
              <FinancialCard
                label="Accumulated Depreciation"
                value={asset.accumulated_depreciation}
                icon={TrendingDown}
                variant="negative"
              />
              <FinancialCard
                label="Book Value"
                value={asset.book_value}
                icon={BookOpen}
                variant={asset.book_value <= 0 ? "destructive" : "default"}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Cost Breakdown</h4>
              <CostBreakdown asset={asset} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Depreciation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DepreciationProgress asset={asset} />
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Assignment & Status */}
      <div className="col-span-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.assigned_to_employee ? (
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={asset.assigned_to_employee.avatar_url} />
                  <AvatarFallback>
                    {asset.assigned_to_employee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium">
                    {asset.assigned_to_employee.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {asset.assigned_to_employee.position}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assigned: {formatDate(asset.assignment_date)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Not assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{asset.location?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {asset.location?.address}
                </p>
                {asset.location?.latitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    GPS: {asset.location.latitude}, {asset.location.longitude}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={getStatusVariant(asset.status)}
                className="text-sm"
              >
                {asset.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {asset.lifecycle_stage}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <StatusFlag label="Capitalized" value={asset.is_capitalized} />
              <StatusFlag label="Depreciable" value={asset.is_depreciable} />
              <StatusFlag
                label="Fully Depreciated"
                value={asset.is_fully_depreciated}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 3. Advanced Search & Filter

### 3.1 Search Interface

```tsx
// components/asset-advanced-search.tsx

interface AssetSearchFilters {
  query: string;
  status: AssetStatus[];
  lifecycle_stage: string[];
  category_ids: string[];
  location_ids: string[];
  department_ids: string[];
  employee_ids: string[];
  company_id?: string;
  acquisition_date_range: { from?: Date; to?: Date };
  value_range: { min?: number; max?: number };
  is_capitalized?: boolean;
  is_depreciable?: boolean;
  has_warranty?: boolean;
  warranty_expiring_soon?: boolean; // Within 30 days
  assigned_or_unassigned?: "assigned" | "unassigned" | "both";
}

export function AssetAdvancedSearch({
  filters,
  onChange,
  onSearch,
}: {
  filters: AssetSearchFilters;
  onChange: (filters: AssetSearchFilters) => void;
  onSearch: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, code, serial number, barcode..."
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="flex-1"
        />
        <Button onClick={onSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
        <Button variant="outline" onClick={() => onChange(defaultFilters)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            Advanced Filters
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Status Filter */}
            <MultiSelect
              label="Status"
              options={assetStatusOptions}
              value={filters.status}
              onChange={(status) => onChange({ ...filters, status })}
              placeholder="Select status..."
            />

            {/* Category Filter */}
            <CategoryMultiSelect
              label="Categories"
              value={filters.category_ids}
              onChange={(category_ids) =>
                onChange({ ...filters, category_ids })
              }
            />

            {/* Location Filter */}
            <LocationMultiSelect
              label="Locations"
              value={filters.location_ids}
              onChange={(location_ids) =>
                onChange({ ...filters, location_ids })
              }
            />

            {/* Department Filter */}
            <DepartmentMultiSelect
              label="Departments"
              value={filters.department_ids}
              onChange={(department_ids) =>
                onChange({ ...filters, department_ids })
              }
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Acquisition Date Range */}
            <DateRangePicker
              label="Acquisition Date"
              value={filters.acquisition_date_range}
              onChange={(range) =>
                onChange({ ...filters, acquisition_date_range: range })
              }
            />

            {/* Value Range */}
            <NumberRangeInput
              label="Book Value Range"
              min={filters.value_range.min}
              max={filters.value_range.max}
              onChange={(range) => onChange({ ...filters, value_range: range })}
              prefix="Rp"
            />

            {/* Capitalized Filter */}
            <Select
              value={filters.is_capitalized?.toString() || "all"}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  is_capitalized:
                    value === "all" ? undefined : value === "true",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Capitalized?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Capitalized</SelectItem>
                <SelectItem value="false">Not Capitalized</SelectItem>
              </SelectContent>
            </Select>

            {/* Assignment Filter */}
            <Select
              value={filters.assigned_or_unassigned}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  assigned_or_unassigned: value as any,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Toggle
              pressed={filters.warranty_expiring_soon}
              onPressedChange={(pressed) =>
                onChange({
                  ...filters,
                  warranty_expiring_soon: pressed,
                })
              }
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Warranty Expiring Soon
            </Toggle>

            <Toggle
              pressed={filters.has_warranty}
              onPressedChange={(pressed) =>
                onChange({
                  ...filters,
                  has_warranty: pressed,
                })
              }
            >
              <Shield className="mr-2 h-4 w-4" />
              Has Warranty
            </Toggle>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters */}
      <ActiveFilters
        filters={filters}
        onRemove={(key) => onChange({ ...filters, [key]: undefined })}
      />
    </div>
  );
}
```

---

## 4. Bulk Operations

### 4.1 Bulk Import

```typescript
// components/asset-bulk-import.tsx

interface BulkImportResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  imported_assets: Asset[];
}

export function AssetBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handleFileUpload = async (file: File) => {
    // Parse CSV/Excel
    const data = await parseAssetImportFile(file);
    setPreview(data.slice(0, 10)); // Preview first 10 rows
    setFile(file);
  };

  const handleImport = async () => {
    if (!file) return;

    const result = await importAssetsBulk(file);
    setResult(result);
  };

  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Assets</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel file to import multiple assets at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Use this template to ensure correct format
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* File Upload */}
          <FileUpload
            accept=".csv,.xlsx,.xls"
            onUpload={handleFileUpload}
            maxSize={10 * 1024 * 1024} // 10MB
          />

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted">
                <p className="font-medium">Preview (First 10 rows)</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Acquisition Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category_name}</TableCell>
                      <TableCell>{formatMoney(row.acquisition_cost)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Validation Rules */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Validation Rules</AlertTitle>
            <AlertDescription className="space-y-1">
              <ul className="list-disc list-inside text-sm">
                <li>Asset code akan digenerate otomatis jika kosong</li>
                <li>Category harus sudah ada di sistem</li>
                <li>Location harus sudah ada di sistem</li>
                <li>Acquisition date format: YYYY-MM-DD</li>
                <li>Acquisition cost harus &gt; 0</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleImport} disabled={!file}>
            <Upload className="mr-2 h-4 w-4" />
            Import {preview.length > 0 && `(${preview.length}+ assets)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.2 Bulk Operations (Update, Transfer, Dispose)

```tsx
// components/asset-bulk-operations.tsx

export function AssetBulkOperations({
  selectedAssets,
  onComplete,
}: {
  selectedAssets: Asset[];
  onComplete: () => void;
}) {
  const [operation, setOperation] = useState<
    "update" | "transfer" | "depreciate" | "dispose"
  >("update");

  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Bulk Operation ({selectedAssets.length} assets selected)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={operation} onValueChange={(v) => setOperation(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="update">Update</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="depreciate">Depreciate</TabsTrigger>
            <TabsTrigger value="dispose">Dispose</TabsTrigger>
          </TabsList>

          <TabsContent value="update" className="space-y-4">
            <BulkUpdateForm
              assets={selectedAssets}
              onSubmit={handleBulkUpdate}
            />
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <BulkTransferForm
              assets={selectedAssets}
              onSubmit={handleBulkTransfer}
            />
          </TabsContent>

          <TabsContent value="depreciate" className="space-y-4">
            <BulkDepreciateForm
              assets={selectedAssets}
              onSubmit={handleBulkDepreciate}
            />
          </TabsContent>

          <TabsContent value="dispose" className="space-y-4">
            <BulkDisposeForm
              assets={selectedAssets}
              onSubmit={handleBulkDispose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation & Schema (Week 1)

**Database:**

- [ ] Migration: Add new columns to fixed_assets table
- [ ] Create asset_attachments table
- [ ] Create asset_audit_logs table
- [ ] Create asset_assignment_history table
- [ ] Add indexes for performance

**Backend:**

- [ ] Update Asset model with new fields
- [ ] Create repositories untuk attachments & audit logs
- [ ] Update DTOs untuk extended asset data
- [ ] Create audit logging middleware/service

**Frontend Types:**

- [ ] Update Asset interface
- [ ] Create new type definitions (Attachment, AuditLog, etc.)

### Phase 2: Core UI Components ✅ COMPLETED

**Asset Detail Enhancement:**

- ✅ Create AssetOverviewTab dengan identity, warranty, assignment
- ✅ Create AssetAcquisitionTab dengan cost breakdown
- ✅ Create AssetDepreciationConfigTab
- ✅ Create AssetAttachmentsTab dengan upload/download
- ✅ Create AssetAuditLogTab
- ✅ Create AssetComponentsTab untuk parent/child relationships
- ✅ Create AssetAssignmentHistoryTab

**Forms:**

- ✅ AssetMasterDataForm (identity fields, QR code generation)
- ✅ AssetAcquisitionForm (cost details, supplier/PO/invoice selection)
- ✅ AssetDepreciationConfigForm (override category defaults)
- ✅ AssetAssignmentForm (assign to employee dengan avatar)

**Advanced Components:**

- ✅ AssetAdvancedSearch (complex filters, saved searches)
- ✅ AssetBulkOperations (update, transfer, depreciate, dispose)

**Integration:**

- ✅ All tabs integrated into AssetDetailModal
- ✅ 9 tabs total: Overview, Depreciations, Transactions, Attachments, Assignment History, Audit Log, Acquisition, Depreciation Config, Components
- ✅ Full TypeScript support dengan proper type definitions
- ✅ i18n support (EN & ID)
- ✅ Responsive design dengan shadcn/ui

**Files Created:**

```
apps/web/src/features/finance/assets/components/
├── asset-tabs/
│   ├── asset-acquisition-tab.tsx         # Cost breakdown, supplier info
│   ├── asset-depreciation-config-tab.tsx # Override category defaults
│   ├── asset-components-tab.tsx          # Parent/child relationships
│   ├── asset-attachments-tab.tsx         # File upload/download
│   ├── asset-audit-log-tab.tsx           # Audit trail
│   └── asset-assignment-history-tab.tsx  # Assignment tracking
├── forms/
│   ├── asset-master-data-form.tsx        # Identity fields
│   ├── asset-acquisition-form.tsx        # Cost details
│   ├── asset-depreciation-config-form.tsx # Depreciation settings
│   └── asset-assignment-form.tsx         # Assign to employee
└── advanced/
    ├── asset-advanced-search.tsx         # Complex filters
    └── asset-bulk-operations.tsx         # Bulk operations
```

### Phase 3: Advanced Features (Week 3)

**Search & Filter:**

- [ ] AssetAdvancedSearch component
- [ ] Backend API dengan complex filtering
- [ ] Saved searches functionality

**Bulk Operations:**

- [ ] Bulk import dari CSV/Excel
- [ ] Bulk update fields
- [ ] Bulk transfer location
- [ ] Bulk depreciate

**Barcode/QR:**

- [ ] Generate QR code untuk assets
- [ ] Barcode scanner integration
- [ ] Asset lookup by barcode

### Phase 4: Asset Lifecycle & Workflow (Week 4)

**Lifecycle Management:**

- [ ] Status workflow (Draft → Active → In Use → Disposed)
- [ ] Approval workflow untuk new assets
- [ ] Assignment & return tracking
- [ ] Location transfer history

**Parent/Child Assets:**

- [ ] Component asset management
- [ ] Asset hierarchy tree view
- [ ] Bulk operations untuk parent assets

### Phase 5: Reporting & Analytics (Week 5-6)

**Reports:**

- [ ] Asset register report (export Excel/PDF)
- [ ] Depreciation schedule report
- [ ] Asset movement report
- [ ] Disposal gain/loss report
- [ ] Warranty expiration report
- [ ] Assignment history report

**Dashboard:**

- [ ] Asset summary cards
- [ ] Depreciation expense chart
- [ ] Asset value trend
- [ ] Upcoming maintenance (integration dengan maintenance module)

### Phase 6: Testing & Optimization (Week 6)

**Testing:**

- [ ] Unit tests untuk services
- [ ] Integration tests untuk API
- [ ] E2E tests untuk critical flows
- [ ] Performance testing dengan large datasets

**Optimization:**

- [ ] Query optimization
- [ ] Frontend performance (virtualized lists)
- [ ] Caching untuk frequently accessed data
- [ ] Database indexing review

---

## 6. API Endpoints Additions

```
# New Endpoints

# Attachments
POST   /api/v1/finance/assets/:id/attachments
GET    /api/v1/finance/assets/:id/attachments
DELETE /api/v1/finance/assets/:id/attachments/:attachmentId

# Assignment
POST   /api/v1/finance/assets/:id/assign
POST   /api/v1/finance/assets/:id/return
GET    /api/v1/finance/assets/:id/assignment-history

# Audit Logs
GET    /api/v1/finance/assets/:id/audit-logs

# Advanced Search
POST   /api/v1/finance/assets/search

# Bulk Operations
POST   /api/v1/finance/assets/bulk-import
POST   /api/v1/finance/assets/bulk-update
POST   /api/v1/finance/assets/bulk-transfer
POST   /api/v1/finance/assets/bulk-depreciate

# QR/Barcode
GET    /api/v1/finance/assets/lookup/:code
GET    /api/v1/finance/assets/:id/qr-code

# Reports
GET    /api/v1/finance/assets/reports/register
GET    /api/v1/finance/assets/reports/depreciation-schedule
GET    /api/v1/finance/assets/reports/movement
GET    /api/v1/finance/assets/reports/warranty-expiry

# Approval Workflow
POST   /api/v1/finance/assets/:id/submit-for-approval
POST   /api/v1/finance/assets/:id/approve
POST   /api/v1/finance/assets/:id/reject
```

---

## 7. Success Metrics

| Metric                  | Before | Target      | Measurement           |
| ----------------------- | ------ | ----------- | --------------------- |
| Asset data completeness | 60%    | 95%+        | % of fields populated |
| Search/filter speed     | 3s     | < 1s        | Average query time    |
| Bulk import capacity    | 0      | 1000 assets | Max per upload        |
| Asset lookup by barcode | N/A    | < 3s        | Average lookup time   |
| User satisfaction       | N/A    | 4.5/5       | Survey rating         |

---

## 8. Risk Mitigation

| Risk                     | Impact | Mitigation                                             |
| ------------------------ | ------ | ------------------------------------------------------ |
| Data migration issues    | High   | Backup database, test migration scripts, rollback plan |
| Performance degradation  | Medium | Add indexes, implement pagination, optimize queries    |
| User adoption resistance | Medium | Training sessions, documentation, gradual rollout      |
| Integration complexity   | Medium | Phased implementation, extensive testing               |

---

**Document Version**: 1.0  
**Last Updated**: March 19, 2026  
**Status**: Ready for Implementation  
**Est. Timeline**: 4-6 weeks
