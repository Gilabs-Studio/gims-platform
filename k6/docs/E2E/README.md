# E2E Scenario Design

> Design document for k6 E2E workflow tests. Review with module teams before implementation.

## Quick Links

| Module | Status | Doc |
|--------|--------|-----|
| [Sales](./SALES.md) | 📝 Designed | Ready for team review |
| [Purchase](./PURCHASE.md) | ⏳ Pending | Needs backend research |
| [CRM](./CRM.md) | ⏳ Pending | Needs backend research |
| [POS](./POS.md) | ⏳ Pending | Needs backend research |
| [Finance](./FINANCE.md) | ⏳ Pending | Needs backend research |
| [HRD](./HRD.md) | ⏳ Pending | Needs backend research |
| [Stock](./STOCK.md) | ⏳ Pending | Needs backend research |
| [Master Data](./MASTER_DATA.md) | ⏳ Pending | Needs backend research |

## Design Decisions

| Decision | Choice |
|----------|--------|
| Approach | Full rewrite from scratch |
| Scope | Happy path + key error cases |
| File structure | One file per module, exported sub-workflows |
| Execution | Distributed — rotate one module per iteration |
| Error handling | `expectedStatuses` to exclude from failure metric |
| Validation | Research backend code BEFORE designing |
| Delivery | Module by module (research → design → implement → test) |

## Execution Model

```javascript
// In endpoint-profiler.js default():
const modules = [sales, purchase, crm, pos, finance, hrd, stock, masterData];
const currentModule = modules[__ITER % modules.length];
currentModule.runWorkflows(auth, data);
```

Each iteration runs ONE module's workflows. Over a full profiler run, every module gets equal coverage.

## File Structure

```
k6/scenarios/e2e/
├── sales.js          # revenueCycle, returnFlow, visitFlow + error cases
├── purchase.js       # purchaseCycle, requisitionFlow, returnFlow + error cases
├── crm.js            # leadToDeal, activityFlow + error cases
├── pos.js            # sessionFlow, orderFlow + error cases
├── finance.js        # journalFlow, reconciliationFlow + error cases
├── hrd.js            # attendanceFlow, leaveFlow, recruitmentFlow + error cases
├── stock.js          # opnameFlow + error cases
├── master-data.js    # productFlow, customerFlow + error cases
└── dashboard-overview.js  # (keep existing)
```
