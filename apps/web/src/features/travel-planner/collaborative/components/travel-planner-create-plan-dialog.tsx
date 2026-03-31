"use client";

import { Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/ui/map/map-picker";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { EmployeeFormOption, EnumOption } from "../types";

interface InitialExpenseItem {
  expense_type: string;
  amount: number;
  description: string;
}

interface TravelPlannerCreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  isSubmitting: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  mode: string;
  onModeChange: (value: string) => void;
  budget: number;
  onBudgetChange: (value: number) => void;
  modeOptions: EnumOption[];
  participantOptions: EmployeeFormOption[];
  selectedParticipantIDs: string[];
  onToggleParticipant: (employeeID: string) => void;
  expenseTypeOptions: EnumOption[];
  initialExpenseItems: InitialExpenseItem[];
  totalExpenseAmount: number;
  onAddExpenseItem: () => void;
  onUpdateExpenseItem: (index: number, field: "expense_type" | "amount" | "description", value: string | number) => void;
  onRemoveExpenseItem: (index: number) => void;
  selectedLocationLat?: number;
  selectedLocationLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onCreate: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function TravelPlannerCreatePlanDialog({
  open,
  onOpenChange,
  canCreate,
  isSubmitting,
  title,
  onTitleChange,
  mode,
  onModeChange,
  budget,
  onBudgetChange,
  modeOptions,
  participantOptions,
  selectedParticipantIDs,
  onToggleParticipant,
  expenseTypeOptions,
  initialExpenseItems,
  totalExpenseAmount,
  onAddExpenseItem,
  onUpdateExpenseItem,
  onRemoveExpenseItem,
  selectedLocationLat,
  selectedLocationLng,
  onLocationChange,
  onCreate,
}: TravelPlannerCreatePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Up Country Cost Plan</DialogTitle>
          <DialogDescription>
            Plan creation is limited to authorized users. Visit Report records must be created via CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Plan title</p>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Plan title"
              disabled={!canCreate || isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Mode</p>
            <Select value={mode} onValueChange={onModeChange} disabled={!canCreate || isSubmitting}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {modeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="cursor-pointer">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">Budget</p>
            <NumericInput
              value={budget}
              onChange={(value) => onBudgetChange(value ?? 0)}
              placeholder="0"
              disabled={!canCreate || isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Participant assignment</p>
            <Badge variant="outline">{selectedParticipantIDs.length}</Badge>
          </div>
          <div className="rounded-lg border p-2 max-h-44 overflow-auto space-y-2">
            {participantOptions.length === 0 ? <p className="text-xs text-muted-foreground">No active employees available.</p> : null}
            {participantOptions.map((employee) => {
              const selected = selectedParticipantIDs.includes(employee.id);
              return (
                <button
                  key={employee.id}
                  type="button"
                  className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    selected ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                  }`}
                  onClick={() => onToggleParticipant(employee.id)}
                  disabled={!canCreate || isSubmitting}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={employee.avatar_url || undefined} alt={employee.name} />
                      <AvatarFallback dataSeed={employee.name}>{employee.name}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{employee.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{employee.employee_code}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Expense items (optional)</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onAddExpenseItem}
              disabled={!canCreate || isSubmitting}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add item
            </Button>
          </div>

          {initialExpenseItems.length > 0 ? (
            <div className="rounded-md bg-muted/50 p-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-semibold">{formatCurrency(budget)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total expenses</p>
                  <p className="font-semibold">{formatCurrency(totalExpenseAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className={`font-semibold ${budget - totalExpenseAmount < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.max(budget - totalExpenseAmount, 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {initialExpenseItems.length === 0 ? <p className="text-xs text-muted-foreground">No initial expense items added.</p> : null}

            {initialExpenseItems.map((item, index) => (
              <div key={`expense-item-${index}`} className="grid gap-2 rounded-md border p-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Select
                    value={item.expense_type}
                    onValueChange={(value) => onUpdateExpenseItem(index, "expense_type", value)}
                    disabled={!canCreate || isSubmitting}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((expenseType) => (
                        <SelectItem key={expenseType.value} value={expenseType.value} className="cursor-pointer">
                          {expenseType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <NumericInput
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(value) => onUpdateExpenseItem(index, "amount", value ?? 0)}
                    disabled={!canCreate || isSubmitting}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(event) => onUpdateExpenseItem(index, "description", event.target.value)}
                    disabled={!canCreate || isSubmitting}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full cursor-pointer"
                    onClick={() => onRemoveExpenseItem(index)}
                    disabled={!canCreate || isSubmitting}
                  >
                    x
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Map section</p>
          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <MapPicker
              latitude={selectedLocationLat}
              longitude={selectedLocationLng}
              onLocationChange={onLocationChange}
              disabled={!canCreate || isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="cursor-pointer" onClick={onCreate} disabled={!canCreate || isSubmitting}>
            <Plus className="h-4 w-4 mr-1" />
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
