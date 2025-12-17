"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ComponentPreview } from "./component-preview";

// Define all components with their categories and paths
const components = [
  // Error Boundary
  {
    name: "ErrorBoundary",
    category: "Core",
    path: "@/components/error-boundary",
    file: "error-boundary.tsx",
  },
  // Loading
  {
    name: "LoginFormSkeleton",
    category: "Loading",
    path: "@/components/loading",
    file: "loading.tsx",
  },
  {
    name: "DashboardSkeleton",
    category: "Loading",
    path: "@/components/loading",
    file: "loading.tsx",
  },
  // Layouts
  {
    name: "AppLayout",
    category: "Layouts",
    path: "@/components/layouts/app-layout",
    file: "app-layout.tsx",
  },
  {
    name: "SidebarWrapper",
    category: "Layouts",
    path: "@/components/layouts/sidebar-wrapper",
    file: "sidebar-wrapper.tsx",
  },
  // Navigation
  {
    name: "Breadcrumb",
    category: "Navigation",
    path: "@/components/navigation/breadcrumb",
    file: "breadcrumb.tsx",
  },
  {
    name: "MainNav",
    category: "Navigation",
    path: "@/components/navigation/main-nav",
    file: "main-nav.tsx",
  },
  {
    name: "Sidebar",
    category: "Navigation",
    path: "@/components/navigation/sidebar",
    file: "sidebar.tsx",
  },
  // Providers
  {
    name: "ThemeProvider",
    category: "Providers",
    path: "@/components/providers/theme-provider",
    file: "theme-provider.tsx",
  },
  // UI Components - Display
  {
    name: "Alert",
    category: "Display",
    path: "@/components/ui/alert",
    file: "alert.tsx",
  },
  {
    name: "Avatar",
    category: "Display",
    path: "@/components/ui/avatar",
    file: "avatar.tsx",
  },
  {
    name: "Badge",
    category: "Display",
    path: "@/components/ui/badge",
    file: "badge.tsx",
  },
  {
    name: "Card",
    category: "Display",
    path: "@/components/ui/card",
    file: "card.tsx",
  },
  {
    name: "Chart",
    category: "Display",
    path: "@/components/ui/chart",
    file: "chart.tsx",
  },
  {
    name: "DataTable",
    category: "Display",
    path: "@/components/ui/data-table",
    file: "data-table.tsx",
  },
  {
    name: "Progress",
    category: "Display",
    path: "@/components/ui/progress",
    file: "progress.tsx",
  },
  {
    name: "Separator",
    category: "Display",
    path: "@/components/ui/separator",
    file: "separator.tsx",
  },
  {
    name: "Skeleton",
    category: "Display",
    path: "@/components/ui/skeleton",
    file: "skeleton.tsx",
  },
  {
    name: "Table",
    category: "Display",
    path: "@/components/ui/table",
    file: "table.tsx",
  },
  // UI Components - Action
  {
    name: "Button",
    category: "Action",
    path: "@/components/ui/button",
    file: "button.tsx",
  },
  {
    name: "DeleteDialog",
    category: "Action",
    path: "@/components/ui/delete-dialog",
    file: "delete-dialog.tsx",
  },
  {
    name: "Dialog",
    category: "Action",
    path: "@/components/ui/dialog",
    file: "dialog.tsx",
  },
  {
    name: "Drawer",
    category: "Action",
    path: "@/components/ui/drawer",
    file: "drawer.tsx",
  },
  {
    name: "DropdownMenu",
    category: "Action",
    path: "@/components/ui/dropdown-menu",
    file: "dropdown-menu.tsx",
  },
  {
    name: "Sheet",
    category: "Action",
    path: "@/components/ui/sheet",
    file: "sheet.tsx",
  },
  {
    name: "Tabs",
    category: "Action",
    path: "@/components/ui/tabs",
    file: "tabs.tsx",
  },
  // UI Components - Filter
  {
    name: "Calendar",
    category: "Filter",
    path: "@/components/ui/calendar",
    file: "calendar.tsx",
  },
  {
    name: "Checkbox",
    category: "Filter",
    path: "@/components/ui/checkbox",
    file: "checkbox.tsx",
  },
  {
    name: "Command",
    category: "Filter",
    path: "@/components/ui/command",
    file: "command.tsx",
  },
  {
    name: "DateRangePicker",
    category: "Filter",
    path: "@/components/ui/date-range-picker",
    file: "date-range-picker.tsx",
  },
  {
    name: "DateTimePicker",
    category: "Filter",
    path: "@/components/ui/date-time-picker",
    file: "date-time-picker.tsx",
  },
  {
    name: "Field",
    category: "Filter",
    path: "@/components/ui/field",
    file: "field.tsx",
  },
  {
    name: "Input",
    category: "Filter",
    path: "@/components/ui/input",
    file: "input.tsx",
  },
  {
    name: "Label",
    category: "Filter",
    path: "@/components/ui/label",
    file: "label.tsx",
  },
  {
    name: "ReminderDateTimePicker",
    category: "Filter",
    path: "@/components/ui/reminder-date-time-picker",
    file: "reminder-date-time-picker.tsx",
  },
  {
    name: "Select",
    category: "Filter",
    path: "@/components/ui/select",
    file: "select.tsx",
  },
  {
    name: "Switch",
    category: "Filter",
    path: "@/components/ui/switch",
    file: "switch.tsx",
  },
  {
    name: "Textarea",
    category: "Filter",
    path: "@/components/ui/textarea",
    file: "textarea.tsx",
  },
  // UI Components - Utils
  {
    name: "Pagination",
    category: "Utils",
    path: "@/components/ui/pagination",
    file: "pagination.tsx",
  },
  {
    name: "Popover",
    category: "Utils",
    path: "@/components/ui/popover",
    file: "popover.tsx",
  },
  {
    name: "ScrollArea",
    category: "Utils",
    path: "@/components/ui/scroll-area",
    file: "scroll-area.tsx",
  },
  {
    name: "Sidebar",
    category: "Utils",
    path: "@/components/ui/sidebar",
    file: "sidebar.tsx",
  },
  {
    name: "ThemeToggle",
    category: "Utils",
    path: "@/components/ui/theme-toggle",
    file: "theme-toggle.tsx",
  },
  {
    name: "Tooltip",
    category: "Utils",
    path: "@/components/ui/tooltip",
    file: "tooltip.tsx",
  },
] as const;

const categories = [
  "All",
  "Core",
  "Loading",
  "Layouts",
  "Navigation",
  "Providers",
  "Display",
  "Action",
  "Filter",
  "Utils",
] as const;

export default function ShowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredComponents = useMemo(() => {
    return components.filter((component) => {
      const matchesSearch =
        searchQuery === "" ||
        component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.path.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || component.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedComponents = useMemo(() => {
    const grouped: Record<string, Array<(typeof components)[number]>> = {};
    filteredComponents.forEach((component) => {
      if (!grouped[component.category]) {
        grouped[component.category] = [];
      }
      grouped[component.category].push(component);
    });
    return grouped;
  }, [filteredComponents]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Component Showcase</h1>
          <p className="text-muted-foreground mt-2">
            Browse and preview all available components in the project
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-md">
          <Input
            type="search"
            placeholder="Search components by name, category, or path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredComponents.length} of {components.length} components
        </div>
      </div>

      <Separator />

      {/* Components List */}
      {filteredComponents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No components found matching your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedComponents).map(
            ([category, categoryComponents]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-2xl font-semibold">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryComponents.map((component) => (
                    <ComponentPreview
                      key={component.name}
                      component={component}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
