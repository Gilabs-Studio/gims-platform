"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useProvince, useProvinces } from "../hooks/use-provinces";
import { useCities } from "../hooks/use-cities";
import { useDistricts } from "../hooks/use-districts";
import { provinceService } from "../services/geographic-service";
import type { Province } from "../types";

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
  readonly lazyLoad?: boolean;
  readonly pageSize?: number;
  /** Fired when user explicitly selects a province. Provides province ID and name. */
  readonly onProvinceChange?: (id: string, name: string) => void;
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
  lazyLoad = false,
  pageSize = 20,
  onProvinceChange,
}: LocationSelectorProps) {
  const fields = { ...DEFAULT_FIELD_NAMES, ...customFieldNames };
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const [shouldLoadProvinces, setShouldLoadProvinces] = useState(!lazyLoad);
  const [shouldLoadCities, setShouldLoadCities] = useState(!lazyLoad);
  const [shouldLoadDistricts, setShouldLoadDistricts] = useState(!lazyLoad);
  const [provinceExtraPages, setProvinceExtraPages] = useState<Province[]>([]);
  const [provinceCurrentPage, setProvinceCurrentPage] = useState(1);
  const [provinceHasMore, setProvinceHasMore] = useState(false);
  const [isLoadingMoreProvinces, setIsLoadingMoreProvinces] = useState(false);

  const provinceId = useWatch({ control, name: fields.province_id });
  const cityId = useWatch({ control, name: fields.city_id });
  const districtId = useWatch({ control, name: fields.district_id });
  const selectedProvinceId = typeof provinceId === "string" ? provinceId : "";

  // Fetch data with cascading dependencies
  const { data: provincesData, isLoading: isProvincesLoading } = useProvinces(
    { per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && (shouldLoadProvinces || !!provinceId) }
  );
  const { data: selectedProvinceData } = useProvince(selectedProvinceId);
  const { data: citiesData } = useCities(
    { province_id: String(provinceId ?? ""), per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!provinceId && (shouldLoadCities || !!cityId) }
  );
  const { data: districtsData } = useDistricts(
    { city_id: String(cityId ?? ""), per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!cityId && (shouldLoadDistricts || !!districtId) }
  );

  const baseProvinces = provincesData?.data ?? [];
  const provinces = useMemo(() => {
    const map = new Map<string, Province>();

    for (const province of baseProvinces) {
      map.set(province.id, province);
    }

    for (const province of provinceExtraPages) {
      map.set(province.id, province);
    }

    const selectedProvince = selectedProvinceData?.data;
    if (selectedProvince?.id && !map.has(selectedProvince.id)) {
      map.set(selectedProvince.id, selectedProvince);
    }

    return Array.from(map.values());
  }, [baseProvinces, provinceExtraPages, selectedProvinceData?.data]);
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];

  useEffect(() => {
    if (provinceCurrentPage > 1 || !provincesData) return;

    const pagination = provincesData.meta?.pagination;
    if (pagination) {
      setProvinceHasMore(pagination.has_next);
      return;
    }

    setProvinceHasMore((provincesData.data?.length ?? 0) >= pageSize);
  }, [pageSize, provinceCurrentPage, provincesData]);

  const handleLoadMoreProvinces = useCallback(async () => {
    if (isProvincesLoading || isLoadingMoreProvinces || !provinceHasMore) return;

    const nextPage = provinceCurrentPage + 1;
    setIsLoadingMoreProvinces(true);

    try {
      const res = await provinceService.list({
        page: nextPage,
        per_page: pageSize,
        sort_by: "name",
        sort_dir: "asc",
      });

      const nextItems = res.data ?? [];
      const pagination = res.meta?.pagination;
      const hasMore = pagination ? pagination.has_next : nextItems.length === pageSize;

      setProvinceExtraPages((prev) => [...prev, ...nextItems]);
      setProvinceCurrentPage(nextPage);
      setProvinceHasMore(hasMore);
    } finally {
      setIsLoadingMoreProvinces(false);
    }
  }, [isLoadingMoreProvinces, isProvincesLoading, pageSize, provinceCurrentPage, provinceHasMore]);

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
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setShouldLoadProvinces(true);
                }
              }}
              onValueChange={(val) => {
                if (!val) return; // Radix fires onValueChange("") when value not in item list
                field.onChange(val);
                setValue(fields.city_id, undefined, { shouldDirty: true });
                setValue(fields.district_id, undefined, { shouldDirty: true });
                const provinceName = provinces.find((p) => p.id === val)?.name ?? "";
                onProvinceChange?.(val, provinceName);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={labels.selectProvince} />
              </SelectTrigger>
              <SelectContent
                onLoadMore={handleLoadMoreProvinces}
                hasMore={provinceHasMore}
                isLoadingMore={isLoadingMoreProvinces}
              >
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
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setShouldLoadCities(true);
                }
              }}
              onValueChange={(val) => {
                if (!val) return; // Radix fires onValueChange("") when value not in item list
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
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setShouldLoadDistricts(true);
                }
              }}
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
