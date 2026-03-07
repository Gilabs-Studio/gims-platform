"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, Loader2, Plus, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserPermission } from "@/hooks/use-user-permission";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface CreatableComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  createPermission?: string;
  createLabel?: string;
  onCreateClick?: (searchQuery: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  ariaInvalid?: boolean;
}

/**
 * A searchable combobox styled identically to the Select component.
 * When search yields no results and the user holds the required permission,
 * an Odoo-style inline "Create '{query}'" action is shown at the bottom.
 */
export function CreatableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  createPermission,
  createLabel = 'Create "{query}"',
  onCreateClick,
  disabled = false,
  isLoading = false,
  className,
  ariaInvalid = false,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const hasCreatePermission = useUserPermission(createPermission ?? "");
  const canCreate = !!createPermission && hasCreatePermission && !!onCreateClick;

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const showCreateButton =
    canCreate && filteredOptions.length === 0 && search.trim().length > 0;

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setActiveIndex(-1);
      setSearch("");
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, []);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = () => {
    onCreateClick?.(search.trim());
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = filteredOptions.length + (showCreateButton ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        handleSelect(filteredOptions[activeIndex].value);
      } else if (activeIndex === filteredOptions.length && showCreateButton) {
        handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const createButtonLabel = createLabel.replace("{query}", search.trim());

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {/* Trigger — identical to SelectTrigger */}
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled || isLoading}
          aria-invalid={ariaInvalid}
          data-placeholder={!selectedLabel ? "" : undefined}
          className={cn(
            "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-primary/10",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            "dark:bg-input/30 dark:hover:bg-input/50",
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2",
            "text-sm whitespace-nowrap shadow-xs transition-all duration-300 outline-none focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "active:scale-[0.98] hover:border-primary/50 hover:shadow-sm cursor-pointer",
            className,
          )}
        >
          <span className="truncate flex-1 text-left">
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </span>
            ) : (
              selectedLabel || (
                <span className="text-muted-foreground">{placeholder}</span>
              )
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 opacity-50 transition-transform duration-200 shrink-0",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      {/* Dropdown — identical visual to SelectContent */}
      <PopoverContent
        className={cn(
          "bg-popover text-popover-foreground",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "relative z-50 overflow-hidden rounded-md border shadow-md",
          "transition-all duration-150 ease-in-out",
          "w-[--radix-popover-trigger-width] p-0",
        )}
        align="start"
      >
        {/* Sticky search bar — mirrors SelectContent's search header */}
        <div className="sticky top-0 z-10 bg-popover border-b p-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Scrollable item list */}
        <div
          role="listbox"
          className="max-h-[220px] overflow-y-auto overflow-x-hidden p-1 scroll-my-1"
        >
          {filteredOptions.length === 0 && !showCreateButton && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          )}

          {filteredOptions.map((option, idx) => (
            <div
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                // Mirrors SelectItem exactly
                "focus:bg-accent focus:text-accent-foreground",
                "[&_svg:not([class*='text-'])]:text-muted-foreground",
                "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm",
                "outline-hidden select-none transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                activeIndex === idx && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate">{option.label}</span>
              {/* Check indicator on the right — mirrors SelectItem */}
              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                {value === option.value && <CheckIcon className="size-4" />}
              </span>
            </div>
          ))}

          {/* Odoo-style create row — only when search yields nothing */}
          {showCreateButton && (
            <div
              role="option"
              onClick={handleCreate}
              onMouseEnter={() => setActiveIndex(filteredOptions.length)}
              className={cn(
                "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm",
                "text-primary outline-hidden select-none transition-colors border-t mt-1 pt-2",
                "hover:bg-accent hover:text-accent-foreground",
                activeIndex === filteredOptions.length &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{createButtonLabel}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
