"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SplitViewSidebarProps<T> {
  readonly items: T[];
  readonly selectedItemId?: number | null;
  readonly onItemClick?: (item: T) => void;
  readonly onViewDetail?: (item: T) => void;
  readonly renderItem: (item: T) => React.ReactNode;
  readonly emptyMessage?: string;
  readonly title?: string;
  readonly className?: string;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function SplitViewSidebar<T extends { id: number }>({
  items,
  selectedItemId,
  onItemClick,
  onViewDetail,
  renderItem,
  emptyMessage = "No items found",
  title,
  className,
  isOpen = true,
  onClose,
}: SplitViewSidebarProps<T>) {
  const isMobile = useIsMobile();

  // Mobile: Use Sheet/Drawer pattern
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[999] md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        {/* Sidebar */}
        <div
          className={cn(
            "fixed left-0 top-0 h-full w-80 bg-background border-r z-[1000] transition-transform duration-300 ease-in-out md:relative md:z-auto",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            className
          )}
        >
          <div className="h-full overflow-y-auto flex flex-col">
            {/* Mobile Header */}
            {title && (
              <div className="flex items-center justify-between p-4 border-b md:hidden">
                <h2 className="font-semibold text-sm">{title}</h2>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="cursor-pointer"
                    aria-label="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="divide-y flex-1">
              {items.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "w-full border-b last:border-0",
                      selectedItemId === item.id &&
                        "bg-accent border-l-4 border-l-primary"
                    )}
                  >
                    <div
                      onClick={() => {
                        onItemClick?.(item);
                        // Close sidebar on mobile after selection
                        if (isMobile && onClose) {
                          onClose();
                        }
                      }}
                      className={cn(
                        "w-full text-left p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                        selectedItemId === item.id && "bg-transparent"
                      )}
                    >
                      {renderItem(item)}
                    </div>
                    {onViewDetail && (
                      <div className="px-4 pb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(item);
                            // Close sidebar on mobile after viewing detail
                            if (isMobile && onClose) {
                              onClose();
                            }
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop: Normal sidebar
  return (
    <div
      className={cn(
        "h-full w-80 bg-background border-r overflow-y-auto flex flex-col shrink-0",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
      )}
      <div className="divide-y flex-1">
        {items.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "w-full border-b last:border-0",
                selectedItemId === item.id &&
                  "bg-accent border-l-4 border-l-primary"
              )}
            >
              <div
                onClick={() => onItemClick?.(item)}
                className={cn(
                  "w-full text-left p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                  selectedItemId === item.id && "bg-transparent"
                )}
              >
                {renderItem(item)}
              </div>
              {onViewDetail && (
                <div className="px-4 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(item);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

