"use client";

import { useEffect } from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useProvinces } from "../hooks/use-provinces";
import { useCities } from "../hooks/use-cities";
import { useDistricts } from "../hooks/use-districts";

interface FieldNames {
  province_id: string;
  city_id: string;
  district_id: string;
  village_name: string;
}

interface LocationSelectorLabels {
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  selectProvince?: string;
  selectCity?: string;
  selectDistrict?: string;
  selectVillage?: string;
  selectProvinceFirst?: string;
  selectCityFirst?: string;
  selectDistrictFirst?: string;
}

interface LocationSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly setValue: UseFormSetValue<any>;
  readonly disabled?: boolean;
  readonly enabled?: boolean;
  readonly fieldNames?: Partial<FieldNames>;
  readonly labels?: LocationSelectorLabels;
  readonly className?: string;
}

const DEFAULT_FIELD_NAMES: FieldNames = {
  province_id: "province_id",
  city_id: "city_id",
  district_id: "district_id",
  village_name: "village_name",
};

const DEFAULT_LABELS: Required<LocationSelectorLabels> = {
  province: "Province",
  city: "City",
  district: "District",
  village: "Village",
  selectProvince: "Select Province",
  selectCity: "Select City",
  selectDistrict: "Select District",
  selectVillage: "Select Village",
  selectProvinceFirst: "Select province first",
  selectCityFirst: "Select city first",
  selectDistrictFirst: "Select district first",
};

/**
 * Reusable cascading location selector for forms with Province -> City -> District -> Village dropdowns.
 * Integrates with react-hook-form via control and setValue props.
 */
export function LocationSelector({
  control,
  setValue,
  disabled = false,
  enabled = true,
  fieldNames: customFieldNames,
  labels: customLabels,
  className,
}: LocationSelectorProps) {
  const fields = { ...DEFAULT_FIELD_NAMES, ...customFieldNames };
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  const provinceId = useWatch({ control, name: fields.province_id });
  const cityId = useWatch({ control, name: fields.city_id });
  const districtId = useWatch({ control, name: fields.district_id });

  // Fetch data with cascading dependencies
  const { data: provincesData } = useProvinces(
    { per_page: 100, sort_by: "name", sort_dir: "asc" },
    { enabled }
  );
  const { data: citiesData } = useCities(
    { province_id: String(provinceId ?? ""), per_page: 100, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!provinceId }
  );
  const { data: districtsData } = useDistricts(
    { city_id: String(cityId ?? ""), per_page: 100, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!cityId }
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];

  // Clear dependent fields when parent value is cleared externally
  useEffect(() => {
    if (!provinceId) {
      setValue(fields.city_id, undefined, { shouldDirty: false });
      setValue(fields.district_id, undefined, { shouldDirty: false });
    }
  }, [provinceId, setValue, fields.city_id, fields.district_id]);

  return (
    <div className={className ?? "grid grid-cols-2 gap-4"}>
      {/* Province */}
      <Field orientation="vertical">
        <FieldLabel>{labels.province}</FieldLabel>
        <Controller
          control={control}
          name={fields.province_id}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => {
                field.onChange(val);
                setValue(fields.city_id, undefined, { shouldDirty: true });
                setValue(fields.district_id, undefined, { shouldDirty: true });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={labels.selectProvince} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {/* City */}
      <Field orientation="vertical">
        <FieldLabel>{labels.city}</FieldLabel>
        <Controller
          control={control}
          name={fields.city_id}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => {
                field.onChange(val);
                setValue(fields.district_id, undefined, { shouldDirty: true });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={labels.selectCity} />
              </SelectTrigger>
              <SelectContent>
                {provinceId ? (
                  cities.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="_" disabled>
                    {labels.selectProvinceFirst}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {/* District */}
      <Field orientation="vertical">
        <FieldLabel>{labels.district}</FieldLabel>
        <Controller
          control={control}
          name={fields.district_id}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => {
                field.onChange(val);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={labels.selectDistrict} />
              </SelectTrigger>
              <SelectContent>
                {cityId ? (
                  districts.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="cursor-pointer">
                      {d.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="_" disabled>
                    {labels.selectCityFirst}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {/* Village - free text input (Indonesia has ~83k villages, dropdown is impractical) */}
      <Field orientation="vertical">
        <FieldLabel>{labels.village}</FieldLabel>
        <Controller
          control={control}
          name={fields.village_name}
          render={({ field }) => (
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={labels.selectVillage ?? "Village / Kelurahan"}
              disabled={disabled}
              className="cursor-text"
            />
          )}
        />
      </Field>
    </div>
  );
}
