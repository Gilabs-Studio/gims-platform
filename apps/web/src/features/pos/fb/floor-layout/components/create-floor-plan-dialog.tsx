"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

import type { CreateFloorPlanData } from "../types";
import { getCreateFloorPlanSchema } from "../schemas/floor-layout.schema";
import { useCreateFloorLayout, useFloorLayoutFormData } from "../hooks/use-floor-layouts";

interface CreateFloorPlanDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSuccess: (id: string) => void;
}

export function CreateFloorPlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFloorPlanDialogProps) {
  const t = useTranslations("floorLayout");
  const schema = getCreateFloorPlanSchema(t);
  const { data: formData, isPending: isLoadingFormData } = useFloorLayoutFormData();
  const createMutation = useCreateFloorLayout();

  const outlets = formData?.data?.outlets ?? [];
  const availableOutlets = outlets.filter((outlet) => !outlet.has_floor_plan);

  const form = useForm<CreateFloorPlanData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      floor_number: 1,
      outlet_id: "",
      grid_size: 20,
      snap_to_grid: true,
      width: 1200,
      height: 800,
    },
  });

  const selectedOutletId = form.watch("outlet_id");
  const selectedOutlet = outlets.find((outlet) => outlet.id === selectedOutletId);

  const handleSubmit = form.handleSubmit(async (data) => {
    const targetOutlet = outlets.find((outlet) => outlet.id === data.outlet_id);
    if (targetOutlet?.has_floor_plan) {
      form.setError("outlet_id", {
        type: "validate",
        message: t("outletAlreadyHasLayout"),
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync(data);
      toast.success(t("messages.createSuccess"));
      form.reset();
      onOpenChange(false);
      if (result?.data?.id) {
        onSuccess(result.data.id);
      }
    } catch {
      toast.error(t("messages.createError"));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company / Outlet */}
          <div className="space-y-1.5">
            <Label>{t("company")}</Label>
            {isLoadingFormData ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={form.watch("outlet_id")}
                onValueChange={(v) => form.setValue("outlet_id", v, { shouldValidate: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("selectOutlet")} />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((outlet) => (
                    <SelectItem
                      key={outlet.id}
                      value={outlet.id}
                      disabled={outlet.has_floor_plan}
                    >
                      {outlet.name}
                      {outlet.has_floor_plan ? ` (${t("outletAlreadyHasLayout")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedOutlet?.has_floor_plan && (
              <p className="text-xs text-destructive">
                {t("outletAlreadyHasLayout")}
              </p>
            )}
            {!selectedOutlet?.has_floor_plan && outlets.length > 0 && availableOutlets.length !== outlets.length && (
              <p className="text-xs text-muted-foreground">
                {t("outletAlreadyHasLayoutHint")}
              </p>
            )}
            {outlets.length > 0 && availableOutlets.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
                <p>{t("noAvailableOutletsHint")}</p>
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <Link href="/master-data/outlet">{t("addOutlet")}</Link>
                </Button>
              </div>
            )}
            {form.formState.errors.outlet_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.outlet_id.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input
              {...form.register("name")}
              placeholder="e.g. Dining Area Layout"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
