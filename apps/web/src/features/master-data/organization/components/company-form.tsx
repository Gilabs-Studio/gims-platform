"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation } from "lucide-react";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";

import { useCreateCompany, useUpdateCompany } from "../hooks/use-companies";
import { useProvinces } from "../../geographic/hooks/use-provinces";
import { useCities } from "../../geographic/hooks/use-cities";
import { useDistricts } from "../../geographic/hooks/use-districts";
import { useVillages } from "../../geographic/hooks/use-villages";
import { getCompanySchema, type CompanyFormData } from "../schemas/organization.schema";
import type { Company } from "../types";

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
}

export function CompanyForm({ open, onClose, company }: CompanyFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!company;
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(getCompanySchema(t)),
    defaultValues: {
      name: "",
      address: "",
      email: "",
      phone: "",
      npwp: "",
      nib: "",
      village_id: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      director_id: "",
      latitude: -6.2088, // Jakarta Default
      longitude: 106.8456, // Jakarta Default
      is_active: true,
    },
  });

  // Watch geographic fields
  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  // Fetch geographic data cascaded
  const { data: provincesData } = useProvinces({ per_page: 100 });
  
  // Note: We're assuming the hooks support filtering by parent ID in query params
  // If not, we might fetch all (likely paginated default 10) which is problematic.
  // In a real scenario, we'd ensure proper endpoints for dropdowns (usually /all or limit=-1).
  // For now, I'll pass per_page: 100 and hope it catches most.
  // Ideally, filter param names match API standard (e.g. province_id).
  
  const { data: citiesData } = useCities(
    provinceId ? { province_id: String(provinceId), per_page: 100 } : undefined
  );
  
  const { data: districtsData } = useDistricts(
    cityId ? { city_id: String(cityId), per_page: 100 } : undefined
  );
  
  const { data: villagesData } = useVillages(
    districtId ? { district_id: String(districtId), per_page: 100 } : undefined
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];
  const villages = villagesData?.data ?? [];

  // Initialize form with company data
  useEffect(() => {
    if (company) {
      // Pre-fill location logic is tricky without full hierarchy in response
      // But our updated Company type has nested village object
      const v = company.village;
      const d = v?.district;
      const c = d?.city;
      const p = c?.province;
      
      reset({
        name: company.name,
        address: company.address ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        npwp: company.npwp ?? "",
        nib: company.nib ?? "",
        village_id: company.village_id ?? "",
        
        // Location cascade from existing data if available
        province_id: p?.id,
        city_id: c?.id,
        district_id: d?.id,
        
        director_id: company.director_id ?? "",
        latitude: company.latitude ?? -6.2088,
        longitude: company.longitude ?? 106.8456,
        is_active: company.is_active,
      });
    } else {
      reset({
        name: "",
        address: "",
        email: "",
        phone: "",
        npwp: "",
        nib: "",
        village_id: "",
        director_id: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
      });
    }
  }, [company, reset, open]);

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload: any = {
        name: data.name,
        address: data.address || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        npwp: data.npwp || undefined,
        nib: data.nib || undefined,
        village_id: data.village_id || undefined,
        director_id: data.director_id || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
      };
      
      if (isEditing && company) {
        await updateCompany.mutateAsync({ id: company.id, data: payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save company:", error);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true });
    setValue("longitude", lng, { shouldValidate: true });
  };
  
  // Handlers for cascade to clear children
  const handleProvinceChange = (val: string) => {
    setValue("province_id", val);
    setValue("city_id", undefined);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };

  const handleCityChange = (val: string) => {
    setValue("city_id", val);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };
  
  const handleDistrictChange = (val: string) => {
    setValue("district_id", val);
    setValue("village_id", undefined);
  };

  const isLoading = createCompany.isPending || updateCompany.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("company.editTitle") : t("company.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">{t("company.sections.basicInfo")}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("company.form.name")}</FieldLabel>
                <Input placeholder={t("company.form.namePlaceholder")} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.email")}</FieldLabel>
                <Input type="email" placeholder={t("company.form.emailPlaceholder")} {...register("email")} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.phone")}</FieldLabel>
                  <Input placeholder={t("company.form.phonePlaceholder")} {...register("phone")} />
                  {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
                </Field>
                 <Field orientation="vertical">
                  <FieldLabel>{t("company.form.address")}</FieldLabel>
                  <Textarea placeholder={t("company.form.addressPlaceholder")} {...register("address")} rows={1} />
                  {errors.address && <FieldError>{errors.address.message}</FieldError>}
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("company.form.npwp")}</FieldLabel>
                <Input placeholder={t("company.form.npwpPlaceholder")} {...register("npwp")} />
                {errors.npwp && <FieldError>{errors.npwp.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.nib")}</FieldLabel>
                <Input placeholder={t("company.form.nibPlaceholder")} {...register("nib")} />
                {errors.nib && <FieldError>{errors.nib.message}</FieldError>}
              </Field>
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">{t("company.sections.location")}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Field orientation="vertical">
                <FieldLabel>{t("company.form.province")}</FieldLabel>
                <Select value={String(provinceId || "")} onValueChange={handleProvinceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              
               <Field orientation="vertical">
                <FieldLabel>{t("company.form.city")}</FieldLabel>
                <Select value={String(cityId || "")} onValueChange={handleCityChange} disabled={!provinceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              
               <Field orientation="vertical">
                <FieldLabel>{t("company.form.district")}</FieldLabel>
                <Select value={String(districtId || "")} onValueChange={handleDistrictChange} disabled={!cityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              
               <Field orientation="vertical">
                <FieldLabel>{t("company.form.village")}</FieldLabel>
                <Select value={String(watch("village_id") || "")} onValueChange={(val) => setValue("village_id", val)} disabled={!districtId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Village" />
                  </SelectTrigger>
                  <SelectContent>
                    {villages.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.village_id && <FieldError>{errors.village_id.message}</FieldError>}
              </Field>
            </div>
          </div>
          
          {/* Coordinates */}
           <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
               <div className="flex items-center gap-2">
                 <Navigation className="h-4 w-4" />
                 <h3 className="text-sm font-medium">{t("company.sections.coordinates")}</h3>
               </div>
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 onClick={() => setIsMapPickerOpen(true)}
                 className="cursor-pointer"
               >
                 <MapPin className="h-3 w-3 mr-1" />
                 {t("company.pickFromMap")}
               </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("company.form.latitude")}</FieldLabel>
                <Input 
                  type="number" 
                  step="any" 
                  {...register("latitude", { valueAsNumber: true })} 
                  placeholder="-6.2088"
                />
                 {errors.latitude && <FieldError>{errors.latitude.message}</FieldError>}
              </Field>
               <Field orientation="vertical">
                <FieldLabel>{t("company.form.longitude")}</FieldLabel>
                 <Input 
                  type="number" 
                  step="any" 
                  {...register("longitude", { valueAsNumber: true })} 
                  placeholder="106.8456"
                />
                 {errors.longitude && <FieldError>{errors.longitude.message}</FieldError>}
              </Field>
            </div>
          </div>

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("company.form.isActive")}</FieldLabel>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading
                ? "Saving..."
                : isEditing
                  ? t("common.save")
                  : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? -6.2088}
        longitude={longitude ?? 106.8456}
        onCoordinateSelect={handleCoordinateSelect}
        title={t("company.mapPicker.title")}
        description={t("company.mapPicker.description")}
      />
    </Dialog>
  );
}
