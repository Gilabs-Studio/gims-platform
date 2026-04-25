"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { StockOpnameItem, StockOpnameItemRequest } from "../types";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { useDebounce } from "@/hooks/use-debounce";
import { useProductStockLevel } from "../hooks/use-stock-opnames";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

// Schema
const itemSchema = z.object({
    product_id: z.string().min(1, "Product is required"),
    system_qty: z.coerce.number().min(0),
    physical_qty: z.coerce.number().min(0),
    notes: z.string().optional(),
});

type FormInput = z.input<typeof itemSchema>;
type FormOutput = z.output<typeof itemSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: StockOpnameItem | null; // If provided, edit mode
    onSave: (item: StockOpnameItemRequest & { id?: string }) => void;
    warehouseId: string;
}

export function StockOpnameItemDialog({ open, onOpenChange, item, onSave, warehouseId }: Props) {
    const t = useTranslations("stock_opname");
    const tCommon = useTranslations("common");
    
    // Product Search State
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [productOpen, setProductOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    
    // Fetch products
    const { data: productsData, isLoading: isLoadingProducts } = useProducts({
        page: 1,
        per_page: 20,
        search: debouncedSearch || undefined,
    });
    const products = productsData?.data ?? [];

    // Fetch current stock level for selected product in this warehouse (add mode only)
    const { data: stockLevelData, isFetching: isFetchingStock } = useProductStockLevel(
        !item ? selectedProductId : null,
        !item ? warehouseId : null,
    );

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors }
    } = useForm<FormInput, unknown, FormOutput>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            product_id: "",
            system_qty: 0,
            physical_qty: 0,
            notes: "",
        },
    });
    const systemQty = useWatch({ control, name: "system_qty" });

    useEffect(() => {
        if (open) {
            if (item) {
                queueMicrotask(() => setSelectedProductId(null));
                reset({
                    product_id: item.product_id,
                    system_qty: item.system_qty,
                    physical_qty: item.physical_qty ?? 0,
                    notes: item.notes || "",
                });
                // We might need to fetch the specific product details if not in list, 
                // but for now we rely on search or pre-loaded data if we add product fetching by ID logic later.
            } else {
                queueMicrotask(() => setSelectedProductId(null));
                reset({
                    product_id: "",
                    system_qty: 0,
                    physical_qty: 0,
                    notes: "",
                });
            }
        }
    }, [open, item, reset]);

    // Auto-populate system_qty when stock level data is fetched
    useEffect(() => {
        if (!item && stockLevelData) {
            const onHand = stockLevelData.data.data[0]?.on_hand ?? 0;
            setValue("system_qty", onHand);
        }
    }, [stockLevelData, item, setValue]);

    const onSubmit = (data: FormOutput) => {
        onSave({
            ...data,
            id: item?.id
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{item ? t("dialog.editItemTitle") : t("dialog.addItemTitle")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Field>
                        <FieldLabel>{t("form.product")}</FieldLabel>
                        <Controller
                            control={control}
                            name="product_id"
                            render={({ field }) => (
                                <Popover open={productOpen} onOpenChange={setProductOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={productOpen}
                                            className="w-full justify-between cursor-pointer"
                                            disabled={!!item} // Disable product selection in edit mode
                                        >
                                            {field.value
                                                ? (products.find((p) => p.id === field.value)?.name || (item?.product_name ?? "Select Product"))
                                                : "Select product..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0">
                                        <Command shouldFilter={false}>
                                            <CommandInput 
                                                placeholder="Search product..." 
                                                value={search}
                                                onValueChange={setSearch}
                                            />
                                            <CommandList>
                                                {isLoadingProducts && <CommandEmpty>Loading...</CommandEmpty>}
                                                {!isLoadingProducts && products.length === 0 && <CommandEmpty>No product found.</CommandEmpty>}
                                                {products.map((product) => (
                                                     <CommandItem
                                                        key={product.id}
                                                        value={product.id}
                                                        onSelect={(currentValue) => {
                                                            setValue("product_id", currentValue);
                                                            setSelectedProductId(currentValue);
                                                            setValue("system_qty", 0); // reset until fetch completes
                                                            setProductOpen(false);
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{product.name}</span>
                                                            <span className="text-xs text-muted-foreground">{product.code}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                        {errors.product_id && <FieldError>{errors.product_id.message}</FieldError>}
                        {item && <p className="text-xs text-muted-foreground mt-1">Product cannot be changed when editing.</p>}
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel>{t("form.systemQty")}</FieldLabel>
                            <Controller
                                control={control}
                                name="system_qty"
                                render={({ field }) => (
                                    <Input 
                                        type="number" 
                                        {...field} 
                                        value={typeof field.value === "number" || typeof field.value === "string" ? field.value : 0}
                                        disabled // System Qty is readonly — auto-populated from inventory
                                        className={cn("bg-muted", isFetchingStock && "opacity-50")}
                                    />
                                )}
                            />
                            {errors.system_qty && <FieldError>{errors.system_qty.message}</FieldError>}
                            {!item && selectedProductId && (
                                isFetchingStock
                                    ? <p className="text-xs text-muted-foreground mt-1">{t("form.systemQtyFetching")}</p>
                                    : systemQty === 0
                                        ? <p className="text-xs text-amber-500 mt-1">{t("form.systemQtyNoStock")}</p>
                                        : null
                            )}
                        </Field>

                        <Field>
                            <FieldLabel>{t("form.physicalQty")}</FieldLabel>
                            <Controller
                                control={control}
                                name="physical_qty"
                                render={({ field }) => (
                                    <Input
                                        type="number"
                                        {...field}
                                        value={typeof field.value === "number" || typeof field.value === "string" ? field.value : 0}
                                    />
                                )}
                            />
                            {errors.physical_qty && <FieldError>{errors.physical_qty.message}</FieldError>}
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel>{t("form.notes")}</FieldLabel>
                        <Controller
                            control={control}
                            name="notes"
                            render={({ field }) => (
                                <Textarea {...field} />
                            )}
                        />
                        {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
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
                        <Button type="submit" className="cursor-pointer">
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
