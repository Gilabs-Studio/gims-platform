---
description: Bug Fix Workflow - Systematic Debugging and Issue Resolution
globs: apps/**/*
alwaysApply: false
---

# Bug Fix Workflow

## Purpose

Systematically debug and fix issues following a structured approach.

## When to Use

- Application errors or crashes
- UI not working as expected
- API returning errors
- Data inconsistencies
- Performance issues
- Integration problems

## Time Estimate

- Simple bug: 15-30 mins
- Medium complexity: 30-60 mins
- Complex bug: 1-3 hours

---

## Phase 1: Reproduction (5-10 mins)

### 1.1 Document the Bug

- [ ] What is the expected behavior?
- [ ] What is the actual behavior?
- [ ] Steps to reproduce
- [ ] Environment (browser, OS, API status)
- [ ] Frequency (always, intermittent, specific conditions)
- [ ] Error messages or screenshots

### 1.2 Reproduce Consistently

- [ ] Follow steps to reproduce 3 times
- [ ] Confirm bug happens consistently
- [ ] Identify minimal reproduction case
- [ ] Check if bug exists in different environments

### 1.3 Check Recent Changes

```bash
# Check recent commits
git log --oneline -10

# Check what files changed recently
git diff HEAD~3 --name-only

# Check for uncommitted changes
git status
```

---

## Phase 2: Root Cause Analysis (10-20 mins)

### 2.1 Identify Affected Area

- [ ] Frontend (React/Next.js)
- [ ] Backend (Go API)
- [ ] Database
- [ ] Integration between layers

### 2.2 Frontend Debugging

#### Check Browser Console

```
F12 → Console tab
- Look for JavaScript errors
- Check network requests
- Review component warnings
```

#### Check Network Requests

```
F12 → Network tab
- Are API calls being made?
- What is the response status?
- Is the response data correct?
- Check request payload
```

#### React DevTools

```
- Check component props
- Check component state
- Review React Query cache
- Verify hooks are working
```

### 2.3 Backend Debugging

#### Check API Logs

```bash
# Terminal where API is running
# Look for error messages

# Or check logs
cd apps/api
make logs
```

#### Test API Directly

```bash
# Test the endpoint with curl
curl -X GET http://localhost:8080/api/v1/entities

# Test with detailed output
curl -v http://localhost:8080/api/v1/entities/123
```

#### Check Database

```bash
# Connect to PostgreSQL
docker exec -it gims-postgres psql -U postgres -d gims_db

# Check if data exists
SELECT * FROM entities WHERE id = '...';

# Check for nulls or bad data
SELECT * FROM entities WHERE name IS NULL;
```

### 2.4 Common Bug Patterns

#### Frontend Issues

| Symptom             | Likely Cause         | Check               |
| ------------------- | -------------------- | ------------------- |
| Blank screen        | React error          | Console for errors  |
| Loading forever     | API not responding   | Network tab         |
| Data not showing    | Wrong data structure | API response format |
| Form not submitting | Validation error     | Form errors         |
| UI glitch           | Missing CSS          | Styles loading?     |

#### Backend Issues

| Symptom       | Likely Cause    | Check             |
| ------------- | --------------- | ----------------- |
| 500 error     | Server crash    | API logs          |
| 404 error     | Wrong endpoint  | URL path          |
| 400 error     | Validation fail | Request body      |
| 401/403 error | Auth issue      | Token/premissions |
| Slow response | DB query        | Query performance |

#### Database Issues

| Symptom          | Likely Cause           | Check              |
| ---------------- | ---------------------- | ------------------ |
| Record not found | Soft deleted           | deleted_at field   |
| Wrong data       | Migration issue        | Schema version     |
| Duplicate key    | Missing validation     | Unique constraints |
| Null pointer     | Missing required field | Nullable columns   |

---

## Phase 3: Fix Implementation (Time varies)

### 3.1 Create Branch

```bash
git checkout -b fix/bug-description
```

### 3.2 Implement Fix

#### Frontend Fix Template

```typescript
// Before (buggy code)
const data = await fetchData(); // Might be undefined
return <div>{data.name}</div>; // Error if data is undefined

// After (fixed code)
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <div>{data?.name ?? '-'}</div>; // Safe access with fallback
```

#### Backend Fix Template

```go
// Before (buggy code)
func (h *Handler) GetByID(c *gin.Context) {
    id := c.Param("id")
    entity, err := h.usecase.GetByID(c, id) // No validation
    // ...
}

// After (fixed code)
func (h *Handler) GetByID(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        response.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid UUID format")
        return
    }

    entity, err := h.usecase.GetByID(c, id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            response.ErrorResponse(c, http.StatusNotFound, "ENTITY_NOT_FOUND", "Entity not found")
            return
        }
        response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch entity")
        return
    }
    // ...
}
```

### 3.3 Fix Checklist

- [ ] Fix addresses root cause (not just symptom)
- [ ] No hardcoded values
- [ ] Proper error handling
- [ ] Edge cases considered
- [ ] No breaking changes
- [ ] Backward compatible

---

## Phase 4: Testing (10-20 mins)

### 4.1 Test the Fix

- [ ] Reproduce the bug → confirm it's fixed
- [ ] Test related functionality still works
- [ ] Test edge cases
- [ ] Test with different data
- [ ] Test in different browsers (if frontend)

### 4.2 Regression Testing

- [ ] Run existing tests

```bash
# Backend
cd apps/api
go test ./...

# Frontend
cd apps/web
npx pnpm test
```

- [ ] Manual testing of related features
- [ ] Check for side effects

### 4.3 Check Code Quality

```bash
# Backend
cd apps/api
go vet ./...
go fmt ./...

# Frontend
cd apps/web
npx pnpm lint
npx pnpm type-check
```

---

## Phase 5: Documentation (10 mins)

### 5.1 Create Bug Fix Documentation

**File**: `docs/bugs/BUG-XXX-<short-description>.md` (for significant bugs)

````markdown
# Bug Report: <Bug Title>

## Bug ID

BUG-XXX or Issue #XXX

## Reported By

@reporter-name

## Reported Date

YYYY-MM-DD

## Severity

- [ ] Critical - System down/data loss
- [ ] High - Major feature broken
- [x] Medium - Feature partially broken
- [ ] Low - UI/cosmetic issue

## Affected Components

- Component A
- Component B
- Module C

## Environment

- **Version**: v1.2.3
- **Environment**: Production/Staging/Development
- **Browser**: Chrome 120 (if applicable)
- **OS**: Windows 11 (if applicable)

## Description

Detailed description of the bug.

## Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3
4. Expected: <expected behavior>
5. Actual: <actual behavior>

## Root Cause Analysis

### Investigation

What was discovered during investigation?

### Root Cause

What was the underlying cause?

- Code defect
- Configuration issue
- Race condition
- Missing validation
- etc.

### Why It Happened

- Human error
- Missing test case
- Design flaw
- Edge case not considered

## Solution Implemented

### Code Changes

```diff
- Old code
+ New code
```
````

### Explanation

Why this fix works.

## Testing Performed

- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Regression testing completed

### Test Cases

1. Test case 1
2. Test case 2

## Prevention Measures

- [ ] Added unit test to prevent regression
- [ ] Updated documentation
- [ ] Added validation
- [ ] Improved error handling

## References

- Issue: #XXX
- PR: #XXX
- Related: #YYY

## Resolution

- **Status**: Fixed
- **Fixed By**: @developer-name
- **Fixed Date**: YYYY-MM-DD
- **Deployed In**: v1.2.4

````

### 5.2 Update Feature Documentation

**File**: `docs/features/<domain>_<feature>.md`

If the bug affects a documented feature:

```markdown
## Known Issues (in relevant feature doc)

### Fixed Issues
| Issue | Description | Fix Version | Date |
|-------|-------------|-------------|------|
| #123 | Entity list shows blank page when no data | v1.2.4 | 2024-01-15 |
````

### 5.3 Update Code Comments

#### Backend Comments

```go
// FIX(2024-01-15, BUG-123): Added null check to prevent panic
// Root cause: Data could be nil when database connection fails
// Solution: Check for nil before accessing properties
if data == nil {
    return nil, errors.New("data not available")
}
```

#### Frontend Comments

```typescript
// FIX(BUG-123, 2024-01-15): Handle undefined data gracefully
// Issue: Component crashed when API returned empty response
// Solution: Add optional chaining and default value
const name = data?.name ?? "N/A";
```

### 5.4 Update API Documentation

**File**: `docs/api-standart/known-issues.md` (if API behavior changed)

```markdown
## Fixed API Issues

### POST /api/v1/entities

**Issue**: Validation error response format inconsistent  
**Fixed**: v1.2.4  
**Before**: Returned string error message  
**After**: Returns structured error object
```

### 5.5 Update Changelog

**File**: `CHANGELOG.md`

```markdown
## [1.2.4] - 2024-01-15

### Fixed

- Fixed entity list blank page issue (#123)
- Resolved null pointer exception in handler
- Fixed validation error message format
```

### 5.6 Commit Message

```
fix: resolve entity list blank page issue (#123)

Root cause: API returned empty array when no entities exist,
but frontend expected object with data property.

Solution:
- Updated frontend to handle empty array response
- Added loading state check before data access
- Added nullish coalescing for safe property access

Changes:
- apps/web/src/features/entity/components/entity-list.tsx
- apps/web/src/features/entity/hooks/use-entities.ts

Testing:
- Added unit test for empty data scenario
- Verified fix with manual testing

Fixes #123
Refs #456
```

### 5.7 Create Pull Request

#### PR Title

`fix: resolve entity list blank page issue (#123)`

#### PR Description

```markdown
## Description

Fixes blank page issue when entity list is empty.

Fixes #123

## Type of Change

- [x] Bug fix (non-breaking change which fixes an issue)

## Root Cause

API was returning empty array `[]` when no entities exist,
but frontend component expected response with `data` property.

## Solution

- Added proper null/undefined checks in component
- Updated hook to handle empty response
- Added fallback UI for empty state

## Changes Made

- `apps/web/src/features/entity/components/entity-list.tsx`
  - Added loading state check
  - Added empty state handling
  - Safe property access with ?. operator
- `apps/web/src/features/entity/hooks/use-entities.ts`
  - Added error boundary
  - Improved error message

## Testing

- [x] Unit tests added
- [x] Manual testing completed
- [x] Regression testing completed

### Test Results

Before fix:

- ❌ Blank page shown when no entities
- ❌ Console error: "Cannot read property of undefined"

After fix:

- ✅ Empty state illustration shown
- ✅ No console errors
- ✅ Create button visible

## Screenshots

### Before

[Insert before screenshot]

### After

[Insert after screenshot]

## Checklist

- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Tests added/updated
- [x] Documentation updated
- [x] No new warnings
- [x] CHANGELOG.md updated
```

### 5.8 Documentation Checklist

- [ ] Bug report created (for significant issues)
- [ ] Root cause documented
- [ ] Solution documented
- [ ] Code comments added (WHY, not WHAT)
- [ ] Feature documentation updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Commit message follows conventional commits
- [ ] PR description is comprehensive

---

## Common Bug Fixes

### Issue: "Cannot read property of undefined"

**Cause**: Accessing property on null/undefined
**Fix**:

```typescript
// Use optional chaining and nullish coalescing
const name = data?.name ?? "N/A";

// Or check before accessing
if (data?.name) {
  return data.name;
}
```

### Issue: "API returns 404"

**Cause**: Wrong endpoint or ID not found
**Fix**:

```typescript
// Check if ID is valid
if (!id || !isValidUUID(id)) {
  return notFound();
}

// Check if record exists
const exists = await checkExists(id);
if (!exists) {
  return notFound();
}
```

### Issue: "Form validation not working"

**Cause**: Schema mismatch or missing validation
**Fix**:

```typescript
// Ensure Zod schema matches API
const schema = z.object({
  name: z.string().min(1, "Required"), // Add error message
  email: z.string().email("Invalid email"),
});

// Use in form
const form = useForm({
  resolver: zodResolver(schema),
});
```

### Issue: "Data not updating after mutation"

**Cause**: Query cache not invalidated
**Fix**:

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onSuccess: () => {
    // Invalidate the query
    queryClient.invalidateQueries({ queryKey: ["data"] });
  },
});
```

### Issue: "Go build fails with import error"

**Cause**: Relative import or missing model in migrate.go
**Fix**:

```go
// Change from:
import "internal/domain/models" // ❌ Relative

// To:
import "github.com/gilabs/gims/api/internal/domain/models" // ✅ Full path

// And ensure model is registered in migrate.go
```

---

## Debugging Tools

### Frontend

- **React DevTools**: Component inspection
- **Redux DevTools**: State inspection
- **Network Tab**: API debugging
- **Console**: JavaScript errors
- **VS Code Debugger**: Step-through debugging

### Backend

- **Log statements**: Add fmt.Println at key points
- **GORM Debug**: Enable SQL logging
- **Delve**: Go debugger
- **Postman**: API testing
- **pprof**: Performance profiling

### Database

- **psql**: Command line PostgreSQL client
- **pgAdmin**: GUI PostgreSQL tool
- **Query logs**: Enable in GORM
- **EXPLAIN**: Analyze slow queries

---

## Prevention Checklist

Before marking complete, ensure:

- [ ] Root cause documented
- [ ] Fix tested thoroughly
- [ ] No regression introduced
- [ ] Code follows conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Monitoring added (if needed)

---

## Example Bug Fix Report

```
## Bug Report

**Issue**: Employee contract list shows blank page

**Reproduction Steps**:
1. Go to HRD → Employee Contracts
2. Page loads but shows blank

**Root Cause**:
- API returns `employee` relation but frontend expects `employee_details`
- Component tries to access `contract.employee_details.name` which is undefined

**Fix**:
- Updated frontend type to match API: `employee` instead of `employee_details`
- Added null checks: `contract.employee?.name ?? 'N/A'`

**Testing**:
- ✅ Page loads correctly
- ✅ Employee names display
- ✅ Empty state works
- ✅ No console errors

**Commit**: abc123 - fix: resolve employee contract list blank page issue
```

---

## Quick Reference

### Debug Commands

```bash
# Check API is running
curl http://localhost:8080/api/v1/health

# Check database connection
docker ps | grep postgres

# View recent logs
docker logs gims-api --tail 50

# Check environment variables
cat apps/api/.env | grep -v PASSWORD
```

### Debug Checklist

1. ☐ Can I reproduce it?
2. ☐ What changed recently?
3. ☐ What do the logs say?
4. ☐ Is it frontend or backend?
5. ☐ What's the root cause?
6. ☐ Does my fix work?
7. ☐ Did I break anything else?
8. ☐ Is it documented?

Ready to fix bugs systematically!
