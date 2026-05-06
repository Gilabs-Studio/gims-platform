import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateOutlet, useUpdateOutlet, useOutlet, useOutletFormData } from "./use-outlets";
import { useUsers } from "@/features/master-data/user-management/hooks/use-users";
import type { Outlet } from "../types";

export const outletFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().max(500).optional(),
  phone: z.string().max(50).regex(/^\d*$/, "Phone number must contain digits only").optional(),
  email: z.string().email().max(100).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  village_id: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  manager_id: z.string().optional(),
  is_active: z.boolean(),
  create_warehouse: z.boolean(),
});

export type OutletFormData = z.infer<typeof outletFormSchema>;

export interface UseOutletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Outlet | null;
  onSuccess?: () => void;
}

export function useOutletForm({ open, onOpenChange, editingItem, onSuccess }: UseOutletFormProps) {
  const t = useTranslations("outlet");
  const isEditing = !!editingItem;

  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();

  const { data: detailRes, isLoading: isLoadingDetail, refetch: refetchDetail } = useOutlet(
    isEditing ? (editingItem.id ?? "") : "",
    { enabled: false }
  );
  const fullOutlet = detailRes?.data ?? editingItem;

  const { data: formDataRes } = useOutletFormData({ enabled: open });
  const { data: usersRes } = useUsers({ per_page: 100, status: "active" }, { enabled: open });

  const rawFormData = formDataRes?.data;
  const formData = rawFormData ? {
    ...rawFormData,
    managers: usersRes?.data?.map(u => ({ id: u.id, name: u.name })) ?? rawFormData.managers ?? []
  } : undefined;

  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: {
      name: "",
      description: "",
      phone: "",
      email: "",
      address: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      village_id: undefined,
      latitude: null,
      longitude: null,
      manager_id: undefined,
      is_active: true,
      create_warehouse: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (isEditing && editingItem?.id) {
      void refetchDetail().then((result) => {
        const entity = result.status === "success" && result.data?.data
          ? result.data.data
          : editingItem;
        if (!entity) return;

        form.reset({
          name: entity.name,
          description: entity.description ?? "",
          phone: entity.phone ?? "",
          email: entity.email ?? "",
          address: entity.address ?? "",
          province_id: entity.province_id ?? entity.village?.district?.city?.province?.id,
          city_id: entity.city_id ?? entity.village?.district?.city?.id,
          district_id: entity.district_id ?? entity.village?.district?.id,
          village_id: entity.village_id ?? undefined,
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          manager_id: entity.manager_id ?? undefined,
          is_active: entity.is_active,
          create_warehouse: false,
        });
      });
    } else if (!isEditing) {
      form.reset({
        name: "",
        description: "",
        phone: "",
        email: "",
        address: "",
        province_id: undefined,
        city_id: undefined,
        district_id: undefined,
        village_id: undefined,
        latitude: null,
        longitude: null,
        manager_id: undefined,
        is_active: true,
        create_warehouse: true,
      });
    }
  }, [open, isEditing, editingItem, editingItem?.id, refetchDetail, form]);

  const onSubmit: SubmitHandler<OutletFormData> = async (data) => {
    try {
      if (isEditing && fullOutlet) {
        await updateOutlet.mutateAsync({
          id: fullOutlet.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
            province_id: data.province_id || null,
            city_id: data.city_id || null,
            district_id: data.district_id || null,
            village_id: data.village_id || null,
            latitude: data.latitude,
            longitude: data.longitude,
            manager_id: data.manager_id || null,
            is_active: data.is_active,
          },
        });
        toast.success(t("outlet.updateSuccess"));
      } else {
        await createOutlet.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          province_id: data.province_id || undefined,
          city_id: data.city_id || undefined,
          district_id: data.district_id || undefined,
          village_id: data.village_id || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          manager_id: data.manager_id || undefined,
          is_active: data.is_active,
          create_warehouse: data.create_warehouse,
        });
        toast.success(t("outlet.createSuccess"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      // Attempt to surface server error message when available. If the error
      // indicates the outlet limit has been reached, suggest the addon flow and
      // open the addon dialog (via window event) so users can increase quota.
      let serverMessage: string | undefined;
      if (typeof err === "object" && err !== null) {
        const maybe = err as Record<string, unknown>;
        const resp = maybe.response as Record<string, unknown> | undefined;
        const data = resp?.data as Record<string, unknown> | undefined;
        serverMessage = (data?.message as string) || (maybe.message as string | undefined);
      }
      const message = serverMessage || t("outlet.saveError");
      toast.error(message);

      // If the server message contains 'limit' or 'outlet limit', request addon dialog
      try {
        const lower = String(message).toLowerCase();
        if (lower.includes("limit") || lower.includes("outlet")) {
          if (typeof window !== "undefined") {
            // Set a resume intent so after invoice flow the create can be resumed
            window.localStorage.setItem("outlet_create_resume_intent", new Date().toISOString().slice(0,10));
            window.dispatchEvent(new CustomEvent("open-outlet-addon"));
            onOpenChange(false);
          }
        }
      } catch {
        // ignore errors from event dispatch
      }
    }
  };

  const isLoading = createOutlet.isPending || updateOutlet.isPending || isLoadingDetail;

  return {
    form,
    t,
    isEditing,
    isLoading,
    formData,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
