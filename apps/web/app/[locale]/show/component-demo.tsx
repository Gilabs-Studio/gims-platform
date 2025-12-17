"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { LoginFormSkeleton, DashboardSkeleton } from "@/components/loading";
import { AppLayout } from "@/components/layouts/app-layout";
import { SidebarWrapper } from "@/components/layouts/sidebar-wrapper";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { MainNav } from "@/components/navigation/main-nav";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ReminderDateTimePicker } from "@/components/ui/reminder-date-time-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar as UISidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { dummyUsers, dummyChartData } from "@/features/data/dummy-data";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface ComponentDemoProps {
  readonly componentName: string;
  readonly category?: string;
}

export function ComponentDemo({ componentName, category }: ComponentDemoProps) {
  const [date, setDate] = useState<Date | null>(new Date());
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(),
  );
  const [dateRange, setDateRange] = useState<
    { from: Date | undefined; to: Date | undefined } | undefined
  >(undefined);
  const [reminderValue, setReminderValue] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Render different components based on name
  switch (componentName) {
    case "ErrorBoundary":
      return (
        <div className="p-4 border rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">
            ErrorBoundary (Class Component)
          </p>
          <ErrorBoundary>
            <div className="text-sm">Component wrapped in ErrorBoundary</div>
          </ErrorBoundary>
        </div>
      );

    case "LoginFormSkeleton":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">LoginFormSkeleton</p>
          <LoginFormSkeleton />
        </div>
      );

    case "DashboardSkeleton":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DashboardSkeleton</p>
          <DashboardSkeleton />
        </div>
      );

    case "AppLayout":
      return (
        <div className="p-4 border rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">AppLayout</p>
          <AppLayout>
            <div className="text-sm">Layout content wrapped</div>
          </AppLayout>
        </div>
      );

    case "SidebarWrapper":
      return (
        <div className="p-4 border rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">SidebarWrapper</p>
          <SidebarWrapper>
            <div className="text-sm">Wrapped content</div>
          </SidebarWrapper>
        </div>
      );

    case "Breadcrumb":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Breadcrumb</p>
          <Breadcrumb />
        </div>
      );

    case "MainNav":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">MainNav</p>
          <MainNav />
        </div>
      );

    case "Sidebar":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Sidebar ({category === "Navigation" ? "Navigation" : "UI"})
          </p>
          <div className="h-48 border rounded-md overflow-hidden">
            <SidebarProvider>
              <UISidebar collapsible="none">
                <SidebarHeader>
                  <div className="text-xs font-semibold">Sidebar Header</div>
                </SidebarHeader>
                <SidebarContent>
                  <div className="text-xs p-2">Sidebar content goes here</div>
                </SidebarContent>
              </UISidebar>
            </SidebarProvider>
          </div>
        </div>
      );

    case "Alert":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Alert</p>
          <Alert>
            <AlertTitle>Alert Title</AlertTitle>
            <AlertDescription>This is an alert description.</AlertDescription>
          </Alert>
        </div>
      );

    case "Avatar":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Avatar</p>
          <div className="flex gap-2">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
              <AvatarFallback className="flex items-center justify-center bg-muted text-sm font-medium">
                CN
              </AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback className="flex items-center justify-center bg-muted text-sm font-medium">
                JD
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      );

    case "Badge":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Badge</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
      );

    case "Button":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Button</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Default</Button>
            <Button variant="secondary" size="sm">
              Secondary
            </Button>
            <Button variant="destructive" size="sm">
              Destructive
            </Button>
            <Button variant="outline" size="sm">
              Outline
            </Button>
            <Button variant="ghost" size="sm">
              Ghost
            </Button>
          </div>
        </div>
      );

    case "Calendar":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Calendar</p>
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={setCalendarDate}
          />
        </div>
      );

    case "Card":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Card</p>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Card content goes here</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      );

    case "Chart":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Chart</p>
          <div className="h-32 w-full">
            <ChartContainer
              config={{
                value: {
                  label: "Value",
                  color: "var(--chart-1)",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...dummyChartData]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      );

    case "Command":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Command</p>
          <Command className="max-w-xs">
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>Calendar</CommandItem>
                <CommandItem>Search Emoji</CommandItem>
                <CommandItem>Calculator</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      );

    case "DataTable": {
      // Define accessor functions outside to avoid component definition warning
      const nameAccessor = (row: (typeof dummyUsers)[number]) => row.name;
      const emailAccessor = (row: (typeof dummyUsers)[number]) => row.email;
      const roleAccessor = (row: (typeof dummyUsers)[number]) => (
        <Badge variant="secondary">{row.role}</Badge>
      );

      const userColumns: Column<(typeof dummyUsers)[number]>[] = [
        {
          id: "name",
          header: "Name",
          accessor: nameAccessor,
        },
        {
          id: "email",
          header: "Email",
          accessor: emailAccessor,
        },
        {
          id: "role",
          header: "Role",
          accessor: roleAccessor,
        },
      ];
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DataTable</p>
          <div className="max-h-48 overflow-auto">
            <DataTable columns={userColumns} data={dummyUsers.slice(0, 3)} />
          </div>
        </div>
      );
    }

    case "DateRangePicker":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DateRangePicker</p>
          <DateRangePicker
            dateRange={
              dateRange ? { from: dateRange.from, to: dateRange.to } : undefined
            }
            onDateChange={(range) => {
              setDateRange(
                range ? { from: range.from, to: range.to } : undefined,
              );
            }}
          />
        </div>
      );

    case "DateTimePicker":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DateTimePicker</p>
          <DateTimePicker
            date={date ?? null}
            time={
              date
                ? `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
                : null
            }
            onDateChange={(newDate, newTime) => {
              if (newDate) {
                const updatedDate = new Date(newDate);
                if (newTime) {
                  const [hours, minutes] = newTime.split(":").map(Number);
                  updatedDate.setHours(hours ?? 0, minutes ?? 0);
                }
                setDate(updatedDate);
              } else {
                setDate(null);
              }
            }}
          />
        </div>
      );

    case "DeleteDialog":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DeleteDialog</p>
          <DeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={() => Promise.resolve()}
            title="Delete Item"
            description="Are you sure you want to delete this item?"
            itemName="Example Item"
          />
          <Button size="sm" onClick={() => setDeleteDialogOpen(true)}>
            Open Delete Dialog
          </Button>
        </div>
      );

    case "Dialog":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Dialog</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  Dialog description goes here.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">Dialog content</p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(false)}>
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );

    case "Drawer":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Drawer</p>
          <Drawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title="Drawer Title"
          >
            <div className="p-4">
              <p className="text-sm">Drawer content goes here</p>
            </div>
          </Drawer>
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            Open Drawer
          </Button>
        </div>
      );

    case "DropdownMenu":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">DropdownMenu</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Open Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );

    case "Field":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Field</p>
          <FieldGroup>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" placeholder="Enter email" />
              <FieldDescription>This is a helper message</FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      );

    case "Checkbox":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Checkbox</p>
          <div className="flex items-center space-x-2">
            <Checkbox id="demo-checkbox" />
            <Label htmlFor="demo-checkbox">Accept terms</Label>
          </div>
        </div>
      );

    case "Input":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Input</p>
          <Input placeholder="Enter text..." />
        </div>
      );

    case "Label":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Label</p>
          <Label>Form Label</Label>
        </div>
      );

    case "Pagination":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Pagination</p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      );

    case "Popover":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Popover</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                Open Popover
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-2">
                <h4 className="font-medium">Popover Title</h4>
                <p className="text-sm text-muted-foreground">
                  Popover content goes here.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );

    case "Progress":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Progress</p>
          <Progress value={33} />
        </div>
      );

    case "ReminderDateTimePicker":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ReminderDateTimePicker
          </p>
          <ReminderDateTimePicker
            value={reminderValue}
            onChange={setReminderValue}
          />
        </div>
      );

    case "ScrollArea":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">ScrollArea</p>
          <ScrollArea className="h-24 w-48 rounded-md border p-4">
            <div className="space-y-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((itemNumber) => (
                <div key={`scroll-item-${itemNumber}`} className="text-sm">
                  Item {itemNumber}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      );

    case "Select":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Select</p>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "Separator":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Separator</p>
          <div className="space-y-1">
            <div>Content above</div>
            <Separator />
            <div>Content below</div>
          </div>
        </div>
      );

    case "Sheet":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Sheet</p>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet Title</SheetTitle>
                <SheetDescription>
                  Sheet description goes here.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <p className="text-sm">Sheet content</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      );

    case "Skeleton":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Skeleton</p>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      );

    case "Table":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Table</p>
          <div className="max-h-48 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyUsers.slice(0, 3).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );

    case "Tabs":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tabs</p>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content for Tab 1</TabsContent>
            <TabsContent value="tab2">Content for Tab 2</TabsContent>
            <TabsContent value="tab3">Content for Tab 3</TabsContent>
          </Tabs>
        </div>
      );

    case "Switch":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Switch</p>
          <div className="flex items-center space-x-2">
            <Switch id="demo-switch" />
            <Label htmlFor="demo-switch">Enable notifications</Label>
          </div>
        </div>
      );

    case "Textarea":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Textarea</p>
          <Textarea placeholder="Enter text..." rows={3} />
        </div>
      );

    case "ThemeToggle":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">ThemeToggle</p>
          <ThemeToggleButton />
        </div>
      );

    case "ThemeProvider":
      return (
        <div className="p-4 border rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">ThemeProvider</p>
          <ThemeProvider>
            <div className="text-sm">Content wrapped in ThemeProvider</div>
          </ThemeProvider>
        </div>
      );

    case "Tooltip":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tooltip</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a tooltip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );

    default:
      return (
        <div className="p-4 border rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">
            Component: {componentName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Preview will be added soon
          </p>
        </div>
      );
  }
}
