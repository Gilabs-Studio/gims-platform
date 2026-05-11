# Fixed Asset Management - START HERE 🚀

> **TL;DR:** 90% of the code already exists. We just need to verify, enhance with security, and fill gaps.

---

## 📊 Current State Assessment

```
✅ 90% Infrastructure Exists
├── 10 Database Models (complete)
├── 5 Repository Files (complete)
├── Depreciation Engine (complete - 5 methods)
├── Asset Usecase (exists - needs security review)
├── Asset Handler (exists - needs endpoint verification)
├── 6 Frontend Directories (complete)
└── Frontend Services, Hooks, Components (partial)

🔄 Need to Verify & Enhance
├── RBAC Permission Checks (are they implemented?)
├── Multi-Tenant Company_ID Filtering (all queries?)
├── Data Isolation Verification (ownership checks?)
├── Audit Logging (created for all operations?)
└── Missing Frontend Components (stepper, preview, etc.?)
```

---

## 🎯 Your Next Steps (In Order)

### Step 1: Understand What Exists (30 minutes) 
**Use Copilot Explore to quickly scan files**

Run these commands to explore the codebase:

```bash
# Backend - Models
head -100 apps/api/internal/finance/data/models/asset.go

# Backend - Repository  
head -50 apps/api/internal/finance/data/repositories/asset_repository.go

# Backend - Usecase
head -100 apps/api/internal/finance/domain/usecase/asset_usecase.go

# Backend - Handler
head -50 apps/api/internal/finance/presentation/handler/asset_handler.go

# Check routes are registered
grep -n "asset" apps/api/internal/finance/presentation/router/routes.go

# Frontend - What components exist?
ls -la apps/web/src/features/finance/fixed-assets/components/

# Frontend - What hooks exist?
ls -la apps/web/src/features/finance/fixed-assets/hooks/

# Frontend - What types exist?
ls -la apps/web/src/features/finance/fixed-assets/types/
```

**Questions to answer:**
- [ ] asset.go has CompanyID field? (Yes/No)
- [ ] asset_repository.go filters by company_id? (Yes/No)
- [ ] asset_usecase.go has permission checks? (Yes/No)
- [ ] asset_handler.go has POST, GET, PATCH endpoints? (Yes/No)
- [ ] Asset routes are registered in routes.go? (Yes/No)
- [ ] How many frontend components exist? (count)
- [ ] Are they TypeScript or JavaScript?

---

### Step 2: Identify Gaps (30 minutes)
**Document what's missing or incomplete**

Create a file called `FINDINGS.md` and answer:

#### Backend Questions
```
1. RBAC (Role-Based Access Control)
   [ ] CreateAsset checks "finance:asset:create" permission?
   [ ] ActivateAsset checks "finance_manager" role?
   [ ] DisposeAsset checks "senior_accountant" role?

2. Multi-Tenant
   [ ] FindByID filters by company_id?
   [ ] List filters by company_id?
   [ ] Create sets company_id from context?

3. Data Isolation
   [ ] CreateAsset verifies category.company_id == user.company_id?
   [ ] UpdateAsset verifies asset.company_id == user.company_id?
   [ ] DeleteAsset verifies asset.company_id == user.company_id?

4. Audit Logging
   [ ] AssetAuditLog created for CREATE?
   [ ] AssetAuditLog created for UPDATE?
   [ ] AssetAuditLog created for ACTIVATE?
   [ ] AssetAuditLog created for DISPOSE?

5. Depreciation
   [ ] ActivateAsset calls depreciation_engine.GenerateSchedule()?
   [ ] Creates AssetDepreciation records?

6. DTOs
   [ ] CreateAssetRequest exists?
   [ ] UpdateAssetRequest exists?
   [ ] ActivateAssetRequest exists?
   [ ] DisposeAssetRequest exists?
   [ ] AssetResponse exists?

7. Mappers
   [ ] asset_mapper.go exists?
   [ ] Maps Model → Response DTO?
```

#### Frontend Questions
```
1. Types & Schemas
   [ ] types/asset.ts exists?
   [ ] Asset interface has all fields?
   [ ] schemas/asset.schema.ts exists?
   [ ] Has Zod validation?

2. Services
   [ ] asset-service.ts exists?
   [ ] Has createAsset() method?
   [ ] Has listAssets() method?
   [ ] Has activateAsset() method?
   [ ] Has disposeAsset() method?

3. Hooks
   [ ] use-create-asset.ts exists?
   [ ] use-list-assets.ts exists?
   [ ] use-activate-asset.ts exists?
   [ ] use-dispose-asset.ts exists?

4. Components
   [ ] asset-form.tsx exists?
   [ ] asset-list.tsx exists?
   [ ] asset-detail.tsx exists?
   [ ] asset-create-stepper.tsx exists?
   [ ] depreciation-preview.tsx exists?

5. i18n
   [ ] Translation keys for assets exist?
```

---

### Step 3: Create Implementation Plan (15 minutes)
**Based on gaps found, create NEXT_STEPS.md**

Example template:
```markdown
# Next Steps

## Backend (1-2 days)
- [ ] Add RBAC checks to asset_usecase.go CreateAsset method
- [ ] Add data isolation check before Update/Delete
- [ ] Verify audit logging in all operations
- [ ] Create asset_mapper.go (if doesn't exist)
- [ ] Verify routes.go has all 8 endpoints

## Frontend (2-3 days)
- [ ] Create asset-create-stepper.tsx (5-step form)
- [ ] Create depreciation-preview.tsx (table)
- [ ] Update asset-service.ts with all API calls
- [ ] Create use-asset-operations.ts hook
- [ ] Update translation keys

## Testing (1-2 days)
- [ ] Test multi-tenant isolation
- [ ] Test RBAC permission checks
- [ ] Test depreciation schedule generation
- [ ] Test dispose gain/loss calculation
```

---

### Step 4: Start Implementing (Daily)

**Daily Pattern:**
1. **Pick one file** to work on
2. **Read it completely** to understand current implementation
3. **Identify what's missing** based on FINDINGS.md
4. **Implement the missing parts** following GIMS patterns
5. **Test locally** if possible
6. **Commit and move to next file**

**Recommended Order:**
1. Backend DTOs (if missing)
2. Backend mappers (if missing)  
3. Backend RBAC checks in usecase
4. Backend data isolation checks
5. Backend audit logging verification
6. Frontend types & schemas
7. Frontend services
8. Frontend hooks
9. Frontend components
10. Testing

---

## 🔍 How to Verify Implementation

### Check RBAC is Working
```bash
# In asset_usecase.go CreateAsset method, should have:
if !h.hasPermission(ctx, "finance:asset:create") {
  return nil, errors.New("permission denied")
}
```

### Check Multi-Tenant is Working
```bash
# In asset_repository.go FindByID, should have:
companyID := ctx.Value("company_id").(string)
var asset Asset
r.db.WithContext(ctx).
  Where("id = ? AND company_id = ?", id, companyID).
  First(&asset)
```

### Check Audit Logging is Working
```bash
# In asset_usecase.go after operations, should have:
s.logAudit(ctx, asset.ID, asset.CompanyID, "CREATE", nil, asset)
// or similar
```

### Check Frontend Permission Gating
```typescript
// In component that needs permission check:
const { permissions } = useAuth();
<button 
  disabled={!permissions.includes('finance:asset:create')}
>
  Create Asset
</button>
```

---

## 📚 Reference Documentation

All detailed implementation guides already exist:

1. **INTEGRATION_PLAN.md** ← Main integration strategy (updated!)
   - Shows what exists vs what needs to be done
   - Detailed checklists for each phase
   - Exact file locations

2. **IMPLEMENTATION_GUIDE.md** ← Code examples and patterns
   - Backend patterns with security notes
   - Depreciation examples
   - Frontend patterns

3. **SECURITY_IMPLEMENTATION_NOTES.md** ← Security deep-dive
   - RBAC implementation details
   - Multi-tenant patterns
   - Data isolation checks
   - Audit logging patterns

4. **ARCHITECTURE.md** ← System design
   - Database schema details
   - API specifications
   - Depreciation methods explained

---

## ⚡ Quick Reference - Common Patterns

### Backend RBAC Pattern
```go
// 1. Extract claims
claims := c.MustGet("claims").(*JWTClaims)

// 2. Check permission
if !h.hasPermission(claims, "finance:asset:create") {
  return // 403 error
}

// 3. Create context with company_id
ctx := context.WithValue(c.Request.Context(), "company_id", claims.CompanyID)

// 4. Call service (which filters by company_id automatically)
result, err := h.service.CreateAsset(ctx, &req)
```

### Repository Query Pattern
```go
// Get company_id from context
companyID := ctx.Value("company_id").(string)

// Always include company_id in WHERE clause
query := r.db.WithContext(ctx).
  Where("company_id = ?", companyID)
```

### Frontend Hooks Pattern
```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ['assets'],
  queryFn: () => assetService.listAssets(),
})

// Mutation
const { mutate, isPending } = useMutation({
  mutationFn: (data) => assetService.createAsset(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  }
})
```

---

## 🎓 Learning Path

If you're new to this codebase:

1. **First**, read the GIMS knowledge base
   - `.github/copilot-instructions.md` ← Start here!
   - Focus on multi-tenant and RBAC sections

2. **Then**, read the existing asset code
   - `apps/api/internal/finance/data/models/asset.go` (models)
   - `apps/api/internal/finance/data/repositories/asset_repository.go` (data access)
   - `apps/api/internal/finance/domain/usecase/asset_usecase.go` (business logic)
   - `apps/api/internal/finance/presentation/handler/asset_handler.go` (API layer)

3. **Finally**, read the implementation guides
   - IMPLEMENTATION_GUIDE.md (code examples)
   - SECURITY_IMPLEMENTATION_NOTES.md (security patterns)

---

## 💡 Pro Tips

### Use Copilot to Explore Quickly
Instead of manually reading files, ask Copilot:
```
"What RBAC permission checks are in asset_usecase.go?"
"Does asset_repository.go filter queries by company_id?"
"List all API endpoints in asset_handler.go"
"What frontend components exist for fixed assets?"
```

### Use Find/Grep to Locate Code
```bash
# Find all permission checks
grep -rn "hasPermission" apps/api/internal/finance/

# Find all company_id filtering
grep -rn "company_id" apps/api/internal/finance/data/

# Find all audit logging
grep -rn "AssetAuditLog" apps/api/internal/finance/

# Find all depreciation calls
grep -rn "depreciation_engine\|DepreciationEngine" apps/api/
```

### Test Your Changes
```bash
# Backend
cd apps/api
go test ./internal/finance/...

# Frontend  
cd apps/web
npm test  # or yarn test or pnpm test
```

---

## ❓ Frequently Asked Questions

**Q: Where do I start coding?**  
A: First complete Step 1-3 above (verify existing code, identify gaps, create plan). Then start with backend files in this order: DTOs → Mappers → Usecase (RBAC) → Handler → Frontend.

**Q: What if I find code that looks wrong?**  
A: Document it in FINDINGS.md. Create the file, note the issue, and we can fix it systematically.

**Q: Do I need to understand the whole codebase?**  
A: No! Focus on:
- How GIMS handles multi-tenant (company_id in context)
- How GIMS handles RBAC (permission strings in handler)
- How GIMS structures backend (usecase → repository → model)
- How GIMS structures frontend (service → hook → component)

**Q: How do I know if multi-tenant is working correctly?**  
A: Query should have `WHERE company_id = ?` with value from context. If company_id is not in WHERE clause, it's a security bug.

**Q: How do I know if RBAC is working correctly?**  
A: Handler should have `hasPermission()` check before calling service. If missing, it's a security bug.

---

## 📞 Need Help?

If you get stuck:

1. **Check the guides**
   - INTEGRATION_PLAN.md for what needs to be done
   - IMPLEMENTATION_GUIDE.md for code examples
   - SECURITY_IMPLEMENTATION_NOTES.md for security patterns

2. **Search existing code**
   - Look at similar features (bank_transfer, journals) for patterns
   - Copy the pattern and adapt for assets

3. **Ask Copilot**
   - "Show me how multi-tenant is handled in bank_transfer_usecase.go"
   - "How does asset_repository.go currently filter by company_id?"
   - "What RBAC checks exist in journal_entry_usecase.go?"

---

## ✅ Success Criteria

You'll know you're done when:

- ✅ All asset endpoints return only current company's assets
- ✅ Creating asset without permission returns 403
- ✅ Activating asset without finance_manager role returns 403  
- ✅ Disposing asset without senior_accountant role returns 403
- ✅ Asset audit log shows all operations with company_id
- ✅ Frontend shows assets only from current company
- ✅ Frontend disables buttons based on user permissions
- ✅ Depreciation schedule generates when asset activated
- ✅ Disposal calculates gain/loss correctly
- ✅ All tests pass

---

**Ready to start? Go to INTEGRATION_PLAN.md and follow the "Immediate Next Steps" section!**
