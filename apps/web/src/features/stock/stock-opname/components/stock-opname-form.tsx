"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { useCreateStockOpname } from "../hooks/use-stock-opnames";

// Schema
const createOpnameSchema = z.object({
  warehouse_id: z.string().min(1, "Warehouse is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  scope_type: z.enum(["all", "category", "brand"]),
});

type FormValues = z.infer<typeof createOpnameSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStockOpnameDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");
  const [step, setStep] = useState(1);
  
  const { data: warehouseData } = useWarehouses({ page: 1, per_page: 20 });
  const warehouses = warehouseData?.data ?? [];

  const createOpname = useCreateStockOpname();

  const {
      control,
      handleSubmit,
      reset,
      getValues,
      formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(createOpnameSchema),
    defaultValues: {
      warehouse_id: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      scope_type: "all",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (step === 1) {
        setStep(2);
        return;
    }

    try {
        await createOpname.mutateAsync({
            ...data,
            // date is already YYYY-MM-DD from form input
        });
        // Feedback would go here
        onOpenChange(false);
        reset();
        setStep(1);
    } catch (error) {
        console.error("Failed to create opname", error);
        toast.error(tCommon("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("dialog.createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {step === 1 && (
                <div className="space-y-4">
                    <Field>
                        <FieldLabel>{t("form.warehouse")}</FieldLabel>
                        <Controller
                            control={control}
                            name="warehouse_id"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("filter.warehouse")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.warehouse_id && <FieldError>{errors.warehouse_id.message}</FieldError>}
                    </Field>

                    <Field>
                        <FieldLabel>{t("form.date")}</FieldLabel>
                        <Controller
                            control={control}
                            name="date"
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal cursor-pointer",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(new Date(field.value), "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ? new Date(field.value) : undefined}
                                            onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                         {errors.date && <FieldError>{errors.date.message}</FieldError>}
                    </Field>

                    <Field>
                        <FieldLabel>{t("form.description")}</FieldLabel>
                         <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <Textarea {...field} />
                            )}
                        />
                        {errors.description && <FieldError>{errors.description.message}</FieldError>}
                    </Field>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                     <Field>
                        <FieldLabel>{t("form.scope")}</FieldLabel>
                        <Controller
                            control={control}
                            name="scope_type"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("form.scopeOptions.all")}</SelectItem>
                                        <SelectItem value="category">{t("form.scopeOptions.category")}</SelectItem>
                                        <SelectItem value="brand">{t("form.scopeOptions.brand")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {errors.scope_type && <FieldError>{errors.scope_type.message}</FieldError>}
                    </Field>

                    <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
                        <p>
                            Summary: Creating Opname for <strong>{warehouses.find(w => w.id === getValues("warehouse_id"))?.name}</strong> on {getValues("date")}.
                        </p>
                    </div>
                </div>
            )}

            <DialogFooter className="mt-6">
                {step > 1 && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep(step - 1)}
                        className="cursor-pointer"
                    >
                        {tCommon("previous")}
                    </Button>
                )}
                <Button 
                    type="submit" 
                    className="cursor-pointer"
                    disabled={createOpname.isPending}
                >
                    {step === 1 ? tCommon("next") : t("dialog.actions.start")}
                </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
