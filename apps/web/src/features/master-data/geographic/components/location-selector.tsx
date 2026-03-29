"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useCities, useCity } from "../hooks/use-cities";
import { useDistricts, useDistrict } from "../hooks/use-districts";
import { useReverseGeocode } from "../hooks/use-reverse-geocode";
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
  useCurrentLocation?: string;
  resolving?: string;
  locationPermissionDenied?: string;
  locationNotSupported?: string;
  locationFailed?: string;
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
  useCurrentLocation: "Use Current Location",
  resolving: "Resolving location...",
  locationPermissionDenied: "Location permission denied. Please enable location access.",
  locationNotSupported: "Geolocation is not supported by your browser",
  locationFailed: "Unable to get your location. Please try again.",
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
  const [locationError, setLocationError] = useState<string | null>(null);

  const provinceId = useWatch({ control, name: fields.province_id });
  const cityId = useWatch({ control, name: fields.city_id });
  const districtId = useWatch({ control, name: fields.district_id });
  const selectedProvinceId = typeof provinceId === "string" ? provinceId : "";
  const selectedCityId = typeof cityId === "string" ? cityId : "";
  const selectedDistrictId = typeof districtId === "string" ? districtId : "";
  const reverseGeocode = useReverseGeocode();

  // Fetch data with cascading dependencies
  const { data: provincesData, isLoading: isProvincesLoading } = useProvinces(
    { per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && (shouldLoadProvinces || !!provinceId) }
  );
  const { data: selectedProvinceData } = useProvince(selectedProvinceId);
  const { data: selectedCityData } = useCity(selectedCityId);
  const { data: selectedDistrictData } = useDistrict(selectedDistrictId);
  const { data: citiesData } = useCities(
    { province_id: String(provinceId ?? ""), per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!provinceId && (shouldLoadCities || !!cityId) }
  );
  const { data: districtsData } = useDistricts(
    { city_id: String(cityId ?? ""), per_page: pageSize, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!cityId && (shouldLoadDistricts || !!districtId) }
  );

  const baseProvinces = useMemo(() => provincesData?.data ?? [], [provincesData?.data]);
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
  const cities = useMemo(() => {
    const baseCities = citiesData?.data ?? [];
    const map = new Map(baseCities.map((city) => [city.id, city] as const));

    const selectedCity = selectedCityData?.data;
    if (selectedCity?.id && !map.has(selectedCity.id)) {
      map.set(selectedCity.id, selectedCity);
    }

    return Array.from(map.values());
  }, [citiesData?.data, selectedCityData?.data]);
  const districts = useMemo(() => {
    const baseDistricts = districtsData?.data ?? [];
    const map = new Map(baseDistricts.map((district) => [district.id, district] as const));

    const selectedDistrict = selectedDistrictData?.data;
    if (selectedDistrict?.id && !map.has(selectedDistrict.id)) {
      map.set(selectedDistrict.id, selectedDistrict);
    }

    return Array.from(map.values());
  }, [districtsData?.data, selectedDistrictData?.data]);

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

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(labels.locationNotSupported);
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        reverseGeocode.mutate(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          {
            onSuccess: (result) => {
              setLocationError(null);
              setShouldLoadProvinces(true);
              setShouldLoadCities(true);
              setShouldLoadDistricts(true);

              setValue(fields.province_id, result.province_id || undefined, { shouldDirty: true });
              setValue(fields.city_id, result.city_id || undefined, { shouldDirty: true });
              setValue(fields.district_id, result.district_id || undefined, { shouldDirty: true });

              if (result.province_id && result.province_name) {
                onProvinceChange?.(result.province_id, result.province_name);
              }
            },
            onError: () => {
              setLocationError(labels.locationFailed);
            },
          }
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(labels.locationPermissionDenied);
          return;
        }
        setLocationError(labels.locationFailed);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [
    fields.city_id,
    fields.district_id,
    fields.province_id,
    labels.locationFailed,
    labels.locationNotSupported,
    labels.locationPermissionDenied,
    onProvinceChange,
    reverseGeocode,
    setValue,
  ]);

  // Clear dependent fields when parent value is cleared externally
  useEffect(() => {
    if (!provinceId) {
      setValue(fields.city_id, undefined, { shouldDirty: false });
      setValue(fields.district_id, undefined, { shouldDirty: false });
    }
  }, [provinceId, setValue, fields.city_id, fields.district_id]);

  return (
    <div className={className ?? "grid grid-cols-2 gap-4"}>
      {!disabled && (
        <div className="col-span-2 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer justify-center gap-2"
            onClick={handleUseCurrentLocation}
            disabled={reverseGeocode.isPending}
          >
            {reverseGeocode.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {labels.useCurrentLocation}
          </Button>
          {reverseGeocode.isPending && (
            <p className="px-1 text-sm text-muted-foreground">{labels.resolving}</p>
          )}
          {locationError && <p className="px-1 text-sm text-destructive">{locationError}</p>}
        </div>
      )}

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
