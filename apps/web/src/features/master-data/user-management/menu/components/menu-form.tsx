"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { DynamicIcon, getAvailableIcons, searchIcons } from "@/lib/icon-utils";
import { createMenuSchema, updateMenuSchema } from "../schemas/menu.schema";
import type { CreateMenuFormData, UpdateMenuFormData } from "../schemas/menu.schema";
import type { Menu } from "../types";
import { useTranslations } from "next-intl";

interface MenuFormProps {
  readonly mode: "create" | "edit";
  readonly initialData?: Menu;
  readonly parentMenus?: Menu[];
  readonly onSubmit: (data: CreateMenuFormData | UpdateMenuFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function MenuForm({ mode, initialData, parentMenus = [], onSubmit, onCancel, isLoading = false }: MenuFormProps) {
  const t = useTranslations("menuManagement");
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);

  const schema = mode === "create" ? createMenuSchema : updateMenuSchema;

  const form = useForm<CreateMenuFormData | UpdateMenuFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      url_path: initialData?.url_path || "",
      icon: initialData?.icon || "",
      order_no: initialData?.order_no || 1,
      parent_id: initialData?.parent_id || null,
    },
  });

  const {
    register,
    handleSubmit: formHandleSubmit,
    control,
    formState: { errors },
    setValue,
  } = form;

  // Filter parent menus to exclude self and descendants
  const filteredParentMenus = useMemo(() => {
    if (!initialData) return parentMenus;
    
    const excludeIds = new Set<number>([initialData.id]);
    
    // Recursively find all descendant IDs
    const findDescendants = (menuId: number) => {
      const children = parentMenus.filter(m => m.parent_id === menuId);
      children.forEach(child => {
        excludeIds.add(child.id);
        findDescendants(child.id);
      });
    };
    
    findDescendants(initialData.id);
    
    return parentMenus.filter(m => !excludeIds.has(m.id));
  }, [parentMenus, initialData]);

  // Get filtered icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery) {
      return getAvailableIcons().slice(0, 50); // Show first 50 icons
    }
    return searchIcons(iconSearchQuery).slice(0, 50);
  }, [iconSearchQuery]);

  const handleFormSubmit = async (data: CreateMenuFormData | UpdateMenuFormData) => {
    // Type assertion to ensure TypeScript knows the data shape
    if (mode === "create") {
      await onSubmit(data as CreateMenuFormData);
    } else {
      await onSubmit(data as UpdateMenuFormData);
    }
  };

  return (
    <form onSubmit={formHandleSubmit(handleFormSubmit)} className="space-y-6">
      <Field>
        <FieldLabel>{t("form.fields.name.label")}</FieldLabel>
        <Input placeholder={t("form.fields.name.placeholder")} {...register("name")} />
        <FieldDescription>{t("form.fields.name.description")}</FieldDescription>
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>{t("form.fields.code.label")}</FieldLabel>
        <Input
          placeholder={t("form.fields.code.placeholder")}
          {...register("code")}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            e.target.value = value;
            setValue("code", value);
          }}
        />
        <FieldDescription>{t("form.fields.code.description")}</FieldDescription>
        {errors.code && <FieldError>{errors.code.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>{t("form.fields.urlPath.label")}</FieldLabel>
        <Input placeholder={t("form.fields.urlPath.placeholder")} {...register("url_path")} />
        <FieldDescription>{t("form.fields.urlPath.description")}</FieldDescription>
        {errors.url_path && <FieldError>{errors.url_path.message}</FieldError>}
      </Field>

      <Controller
        control={control}
        name="icon"
        render={({ field }) => (
          <Field>
            <FieldLabel>{t("form.fields.icon.label")}</FieldLabel>
            <Popover open={isIconPopoverOpen} onOpenChange={setIsIconPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isIconPopoverOpen}
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {field.value && <DynamicIcon name={field.value} className="size-4" />}
                    <span>{field.value || t("form.fields.icon.placeholder")}</span>
                  </div>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t("form.fields.icon.search")}
                    value={iconSearchQuery}
                    onValueChange={setIconSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>{t("form.fields.icon.noResults")}</CommandEmpty>
                    <CommandGroup>
                      {filteredIcons.map((iconName) => (
                        <CommandItem
                          key={iconName}
                          value={iconName}
                          onSelect={() => {
                            field.onChange(iconName);
                            setIsIconPopoverOpen(false);
                            setIconSearchQuery("");
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              field.value === iconName ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <DynamicIcon name={iconName} className="mr-2 size-4" />
                          <span>{iconName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldDescription>{t("form.fields.icon.description")}</FieldDescription>
            {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
          </Field>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>{t("form.fields.orderNo.label")}</FieldLabel>
          <Input
            type="number"
            placeholder={t("form.fields.orderNo.placeholder")}
            {...register("order_no", {
              valueAsNumber: true,
            })}
          />
          <FieldDescription>{t("form.fields.orderNo.description")}</FieldDescription>
          {errors.order_no && <FieldError>{errors.order_no.message}</FieldError>}
        </Field>

        <Controller
          control={control}
          name="parent_id"
          render={({ field }) => (
            <Field>
              <FieldLabel>{t("form.fields.parentId.label")}</FieldLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value, 10))}
                value={field.value?.toString() || "null"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.fields.parentId.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t("form.fields.parentId.noParent")}</SelectItem>
                  {filteredParentMenus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id.toString()}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t("form.fields.parentId.description")}</FieldDescription>
              {errors.parent_id && <FieldError>{errors.parent_id.message}</FieldError>}
            </Field>
          )}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("form.buttons.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isLoading ? t("form.buttons.submitting") : t("form.buttons.submit")}
        </Button>
      </div>
    </form>
  );
}
