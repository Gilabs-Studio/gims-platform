# Calendar Component

> **Path:** `apps/web/src/components/ui/calendar.tsx`
> **Based on:** [react-day-picker](https://daypicker.dev/) v9 + shadcn/ui
> **Last Updated:** 2026-02-28

## Overview

Enhanced calendar component built on top of `react-day-picker` (DayPicker) with custom month/year picker navigation, Tailwind CSS styling, and full `classNames` override support. Used across the GIMS platform for date inputs, date range pickers, and the attendance history calendar.

## Features

- **Three navigation modes:** Day grid (default), Month picker, Year picker
- **Controlled & uncontrolled:** Supports both controlled (`month` / `onMonthChange`) and uncontrolled usage
- **Selection modes:** `single`, `multiple`, `range` (from react-day-picker)
- **Full classNames override:** All DayPicker element keys can be overridden, including `month_grid`, `weeks`, `week`
- **Full-width support:** Pass `className="w-full"` to expand the calendar to fill its container
- **Custom modifiers:** Supports `modifiers` and `modifiersClassNames` for status indicators (e.g., attendance dots)

## API Reference

### Props

| Prop                  | Type                                           | Default        | Description                                        |
| --------------------- | ---------------------------------------------- | -------------- | -------------------------------------------------- |
| `mode`                | `"single" \| "multiple" \| "range"`            | —              | Selection mode                                     |
| `selected`            | `Date \| Date[] \| { from?: Date; to?: Date }` | —              | Currently selected date(s)                         |
| `onSelect`            | `(value) => void`                              | —              | Callback when selection changes                    |
| `month`               | `Date`                                         | `new Date()`   | Controlled displayed month                         |
| `onMonthChange`       | `(month: Date \| undefined) => void`           | —              | Callback when month changes                        |
| `className`           | `string`                                       | —              | CSS class for the root wrapper                     |
| `classNames`          | `DayPickerProps["classNames"]`                 | See defaults   | Override classes for individual DayPicker elements |
| `showOutsideDays`     | `boolean`                                      | `true`         | Show days from adjacent months                     |
| `components`          | `DayPickerProps["components"]`                 | Custom caption | Override DayPicker sub-components                  |
| `modifiers`           | `Record<string, Date[]>`                       | —              | Custom day modifiers for conditional styling       |
| `modifiersClassNames` | `Record<string, string>`                       | —              | Class names for custom modifiers                   |

> All other `react-day-picker` DayPickerProps are also accepted via rest props.

### Default classNames

These are the built-in class names applied to each DayPicker element. Override any key via the `classNames` prop — values are merged using `cn()` (tailwind-merge), so conflicting utilities resolve correctly.

```ts
{
  months:       "relative flex flex-col sm:flex-row gap-4",
  month:        "w-full",
  month_caption:"relative mb-1 flex h-9 items-center justify-between z-20",
  caption_label:"text-sm font-medium",
  nav:          "hidden",
  weekday:      "size-9 p-0 text-xs font-medium text-muted-foreground/80",
  day:          "group size-9 px-0 py-px text-sm",
  day_button:   "relative flex size-9 items-center justify-center ...",
  today:        "*:after:... (dot indicator)",
  outside:      "text-muted-foreground ...",
  hidden:       "invisible",
  week_number:  "size-9 p-0 text-xs font-medium text-muted-foreground/80",
}
```

> **Note:** Keys not in this default list (e.g., `month_grid`, `weeks`, `week`) are still passed through to DayPicker when specified in `classNames`. The merge logic includes all keys from both defaults and user overrides.

## Usage Examples

### Basic Date Picker (Default Size)

```tsx
import { Calendar } from "@/components/ui/calendar";

function DatePickerExample() {
  const [date, setDate] = useState<Date>();

  return <Calendar mode="single" selected={date} onSelect={setDate} />;
}
```

### Full-Width Calendar (Sidebar / Panel)

Pass `className="w-full"` and override cell classNames to make the calendar fill its container:

```tsx
<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={(d) => d && setSelectedDate(d)}
  month={month}
  onMonthChange={setMonth}
  className="w-full"
  classNames={{
    months: "w-full",
    month: "w-full",
    month_caption: "hidden", // Hide if using external navigation
    month_grid: "w-full table-fixed border-collapse",
    weeks: "w-full",
    week: "w-full",
    weekday:
      "w-full p-0 h-10 text-sm font-semibold text-muted-foreground text-center",
    day: "h-12 w-full p-0",
    day_button:
      "relative w-full h-10 px-1 items-center justify-center rounded-lg text-sm transition-colors",
  }}
/>
```

### With Custom Modifiers (Status Dots)

```tsx
<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  modifiers={{
    present: presentDates,
    absent: absentDates,
    late: lateDates,
  }}
  modifiersClassNames={{
    present:
      "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-emerald-500 [&>button]:after:content-['']",
    absent: "... [&>button]:after:bg-red-500 ...",
    late: "... [&>button]:after:bg-yellow-500 ...",
  }}
/>
```

### Controlled Month Navigation

```tsx
function ControlledCalendar() {
  const [month, setMonth] = useState(new Date());

  return (
    <>
      <Button onClick={() => setMonth(addMonths(month, -1))}>Prev</Button>
      <Button onClick={() => setMonth(addMonths(month, 1))}>Next</Button>
      <Calendar mode="single" month={month} onMonthChange={setMonth} />
    </>
  );
}
```

### Date Range Selection

```tsx
<Calendar
  mode="range"
  selected={{ from: startDate, to: endDate }}
  onSelect={(range) => {
    setStartDate(range?.from);
    setEndDate(range?.to);
  }}
/>
```

## Architecture

### Internal State

| State           | Type                         | Description                              |
| --------------- | ---------------------------- | ---------------------------------------- |
| `internalMonth` | `Date`                       | Tracks displayed month when uncontrolled |
| `mode`          | `"day" \| "month" \| "year"` | Current navigation mode                  |

When `mode` is `"month"` or `"year"`, the day grid is hidden (via `hidden` class) and replaced with a month/year picker grid. The custom `MonthCaption` component provides clickable month/year labels to toggle between modes.

### classNames Merge Logic

```
User classNames ──┐
                   ├─ Set union of all keys ─── cn(default, user, hideClass) ─── mergedClassNames
Default classNames ┘
```

The merge uses `cn()` (which wraps `twMerge`) so conflicting Tailwind utilities resolve correctly. For example, `cn("size-9", "w-full h-12")` resolves to `w-full h-12` — the user override wins.

> **Important:** This merge includes ALL keys from both `defaultClassNames` and user-supplied `classNames`. DayPicker keys like `month_grid`, `weeks`, `week` that are not in the defaults will still be passed through when provided by the consumer.

### Component Hierarchy

```
Calendar (wrapper)
├── DayPicker (react-day-picker)
│   ├── MonthCaption (custom) ── month/year clickable labels
│   │   ├── ← ChevronLeft button
│   │   ├── Month label (clickable → month picker)
│   │   ├── Year label (clickable → year picker)
│   │   └── ChevronRight button →
│   ├── Weekday headers
│   └── Day grid (hidden in month/year mode)
├── Month picker grid (visible in month mode)
└── Year picker grid (visible in year mode, scrollable)
```

## Where It's Used

| Context                    | File                                                                     | Layout                      |
| -------------------------- | ------------------------------------------------------------------------ | --------------------------- |
| Date input popovers        | Various form components                                                  | Default (compact)           |
| Attendance history sidebar | `features/hrd/attendance-records/components/attendance-calendar-tab.tsx` | Full-width with status dots |
| Date range filters         | Filter components                                                        | Default or custom width     |

## Changelog

### 2026-02-28

- **Fix:** Removed hardcoded `w-fit` from wrapper and DayPicker root — the calendar now respects `className="w-full"` to fill its container
- **Fix:** Fixed `mergedClassNames` logic to include ALL keys from both `defaultClassNames` and user `classNames` — previously, keys not in defaults (e.g., `month_grid`, `weeks`, `week`) were silently dropped
- **Impact:** No breaking changes. Existing calendar usage (popovers, date pickers) unaffected since they don't pass `w-full`

## Troubleshooting

### Calendar not filling container width

Ensure you pass both `className="w-full"` AND override the cell-level classNames:

```tsx
classNames={{
  month_grid: "w-full table-fixed",
  day: "w-full ...",
  weekday: "w-full ...",
}}
```

The `table-fixed` on `month_grid` is critical — without it, the table auto-sizes to content width.

### Month/Year picker not showing

The month and year picker are toggled by clicking the month name or year in the caption. If `month_caption` is set to `"hidden"` (e.g., when using external navigation), the built-in month/year picker will not be accessible. Provide your own navigation controls in this case.

### Modifier dots not visible

Modifier pseudo-elements use `[&>button]:after:` selectors. Make sure the day cells have `position: relative` (included by default in `day_button`). If you override `day_button`, include `relative` in your className.
