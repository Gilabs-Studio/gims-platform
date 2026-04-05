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

  const companies = formData?.data?.companies ?? [];

  const form = useForm<CreateFloorPlanData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      floor_number: 1,
      company_id: "",
      grid_size: 20,
      snap_to_grid: true,
      width: 1200,
      height: 800,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
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
                value={form.watch("company_id")}
                onValueChange={(v) => form.setValue("company_id", v, { shouldValidate: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("selectOutlet")} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.company_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.company_id.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input
              {...form.register("name")}
              placeholder="e.g. Ground Floor"
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
