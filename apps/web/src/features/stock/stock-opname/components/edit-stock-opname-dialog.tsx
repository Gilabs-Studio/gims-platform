"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useUpdateStockOpname } from "../hooks/use-stock-opnames";
import { toast } from "sonner";
import { StockOpname } from "../types";

const editOpnameSchema = z.object({
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof editOpnameSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    opname: StockOpname;
}

export function EditStockOpnameDialog({ open, onOpenChange, opname }: Props) {
    const t = useTranslations("stock_opname");
    const tCommon = useTranslations("common");
    const updateMutation = useUpdateStockOpname();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<FormValues>({
        resolver: zodResolver(editOpnameSchema),
        defaultValues: {
            date: opname.date ? format(new Date(opname.date), "yyyy-MM-dd") : "",
            description: opname.description || "",
        },
    });

    useEffect(() => {
        if (open && opname) {
            reset({
                date: opname.date ? format(new Date(opname.date), "yyyy-MM-dd") : "",
                description: opname.description || "",
            });
        }
    }, [open, opname, reset]);

    const onSubmit = async (data: FormValues) => {
        try {
            await updateMutation.mutateAsync({
                id: opname.id,
                data: data,
            });
            toast.success(tCommon("saved"));
            onOpenChange(false);
        } catch (error) {
            toast.error(tCommon("error"));
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialog.editTitle")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer"
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            className="cursor-pointer"
                            disabled={updateMutation.isPending}
                        >
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
