"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";
import { MapPin, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";
import { useProvince, useProvinces } from "../hooks/use-provinces";
import { useCities, useCity } from "../hooks/use-cities";
import { useDistricts, useDistrict } from "../hooks/use-districts";
import { useReverseGeocode } from "../hooks/use-reverse-geocode";
import type { ReverseGeocodeResult } from "../types";

interface LocationFieldNames {
  province_id: string;
  city_id: string;
  district_id: string;
  village_name: string;
  latitude: string;
  longitude: string;
}

interface LocationPickerLabels {
  pickFromMap?: string;
  useCurrentLocation?: string;
  resolvedLocation?: string;
  advancedMode?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  selectProvince?: string;
  selectCity?: string;
  selectDistrict?: string;
  villagePlaceholder?: string;
  mapPickerTitle?: string;
  mapPickerDescription?: string;
  noLocation?: string;
  resolving?: string;
  locationPermissionDenied?: string;
  locationNotSupported?: string;
  locationFailed?: string;
}

interface LocationPickerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly setValue: UseFormSetValue<any>;
  readonly disabled?: boolean;
  readonly enabled?: boolean;
  readonly fieldNames?: Partial<LocationFieldNames>;
  readonly labels?: LocationPickerLabels;
  readonly className?: string;
  /** Fired when user explicitly changes province (map geocode or manual dropdown). Provides province ID and name. */
  readonly onProvinceChange?: (id: string, name: string) => void;
}

const DEFAULT_FIELD_NAMES: LocationFieldNames = {
  province_id: "province_id",
  city_id: "city_id",
  district_id: "district_id",
  village_name: "village_name",
  latitude: "latitude",
  longitude: "longitude",
};

const DEFAULT_LABELS: Required<LocationPickerLabels> = {
  pickFromMap: "Pick from Map",
  useCurrentLocation: "Use Current Location",
  resolvedLocation: "Location",
  advancedMode: "Manual Selection",
  province: "Province",
  city: "City / Regency",
  district: "District",
  village: "Village / Kelurahan",
  selectProvince: "Select Province",
  selectCity: "Select City",
  selectDistrict: "Select District",
  villagePlaceholder: "Village / Kelurahan",
  mapPickerTitle: "Select Location",
  mapPickerDescription: "Click on the map or drag the marker to set location",
  noLocation: "No location selected",
  resolving: "Resolving location...",
  locationPermissionDenied: "Location permission denied. Please enable location access.",
  locationNotSupported: "Geolocation is not supported by your browser",
  locationFailed: "Unable to get your location. Please try again.",
};

// Default map center: Jakarta, Indonesia
const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

/**
 * Unified location picker component that replaces all duplicated cascading
 * dropdown + coordinate + map picker patterns across the application.
 *
 * Primary interaction: "Pick from Map" button opens MapPickerModal,
 * on confirm calls reverse geocoding to auto-fill Province/City/District.
 *
 * Advanced mode: toggleable section that reveals cascading dropdowns
 * for manual override of the auto-resolved administrative boundaries.
 */
export function LocationPicker({
  control,
  setValue,
  disabled = false,
  enabled = true,
  fieldNames: customFieldNames,
  labels: customLabels,
  className,
  onProvinceChange,
}: LocationPickerProps) {
  const fields = { ...DEFAULT_FIELD_NAMES, ...customFieldNames };
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Watch form fields reactively
  const provinceId = useWatch({ control, name: fields.province_id });
  const cityId = useWatch({ control, name: fields.city_id });
  const districtId = useWatch({ control, name: fields.district_id });
  const latitude = useWatch({ control, name: fields.latitude });
  const longitude = useWatch({ control, name: fields.longitude });
  const selectedProvinceId = typeof provinceId === "string" ? provinceId : "";
  const selectedCityId = typeof cityId === "string" ? cityId : "";
  const selectedDistrictId = typeof districtId === "string" ? districtId : "";

  // Reverse geocode mutation
  const reverseGeocode = useReverseGeocode();

  // When the geocoder sets all three IDs atomically we must NOT trigger the
  // cascading-clear logic inside the City / Province onValueChange handlers
  // (those clears are only meaningful when the USER manually changes a dropdown).
  const isProgrammaticChange = useRef(false);

  // Fetch geographic data for cascading dropdowns.
  // Pre-fetch when IDs are already set (reverse geocode / edit mode)
  // so data is ready before the user opens advanced mode.
  const { data: provincesData } = useProvinces(
    { per_page: 20, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && (showAdvanced || !!provinceId) }
  );
  const { data: selectedProvinceData } = useProvince(selectedProvinceId);
  const { data: citiesData } = useCities(
    { province_id: String(provinceId ?? ""), per_page: 20, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!provinceId && (showAdvanced || !!cityId) }
  );
  const { data: selectedCityData } = useCity(selectedCityId);
  const { data: districtsData } = useDistricts(
    { city_id: String(cityId ?? ""), per_page: 20, sort_by: "name", sort_dir: "asc" },
    { enabled: enabled && !!cityId && (showAdvanced || !!districtId) }
  );
  const { data: selectedDistrictData } = useDistrict(selectedDistrictId);

  const provinces = useMemo(() => {
    const baseProvinces = provincesData?.data ?? [];
    const map = new Map(baseProvinces.map((province) => [province.id, province] as const));

    const selectedProvince = selectedProvinceData?.data;
    if (selectedProvince?.id && !map.has(selectedProvince.id)) {
      map.set(selectedProvince.id, selectedProvince);
    }

    return Array.from(map.values());
  }, [provincesData?.data, selectedProvinceData?.data]);

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

  // Build human-readable location summary
  const [resolvedNames, setResolvedNames] = useState<{
    province?: string;
    city?: string;
    district?: string;
  }>({});

  const resolvedSummary = (() => {
    const parts: string[] = [];
    if (resolvedNames.district) parts.push(resolvedNames.district);
    if (resolvedNames.city) parts.push(resolvedNames.city);
    if (resolvedNames.province) parts.push(resolvedNames.province);
    return parts.join(", ");
  })();

  // Shared helper — apply a reverse geocode result unconditionally.
  // Uses the same no-guard pattern as resolvedSummary so all three levels
  // always reflect the latest resolved location.
  const applyGeocodeResult = useCallback(
    (result: ReverseGeocodeResult) => {
      setLocationError(null);
      // Prevent Province / City onValueChange cascade-clear from wiping fields
      // that we are about to set atomically right below.
      isProgrammaticChange.current = true;
      setValue(fields.province_id, result.province_id || undefined, { shouldDirty: true });
      setValue(fields.city_id, result.city_id || undefined, { shouldDirty: true });
      setValue(fields.district_id, result.district_id || undefined, { shouldDirty: true });
      isProgrammaticChange.current = false;
      setResolvedNames({
        province: result.province_name || undefined,
        city: result.city_name || undefined,
        district: result.district_name || undefined,
      });
      // Notify parent — geocoding is always a user-initiated action (map pick)
      if (result.province_id && result.province_name) {
        onProvinceChange?.(result.province_id, result.province_name);
      }
    },
    [setValue, fields.province_id, fields.city_id, fields.district_id, onProvinceChange]
  );

  // When coordinates are selected from the map picker, run reverse geocode.
  // Pre-sets lastResolvedCoords to prevent the coordKey effect from firing
  // a duplicate request for the same pick.
  const handleCoordinateSelect = useCallback(
    (lat: number, lng: number) => {
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      setLastResolvedCoords(key);
      setValue(fields.latitude, lat, { shouldValidate: true, shouldDirty: true });
      setValue(fields.longitude, lng, { shouldValidate: true, shouldDirty: true });

      reverseGeocode.mutate(
        { lat, lng },
        {
          onSuccess: applyGeocodeResult,
          onError: () => {
            // Clear stale admin IDs so the form doesn't submit old geo values
            setValue(fields.province_id, undefined, { shouldDirty: true });
            setValue(fields.city_id, undefined, { shouldDirty: true });
            setValue(fields.district_id, undefined, { shouldDirty: true });
            setResolvedNames({});
          },
        }
      );
    },
    [setValue, fields.latitude, fields.longitude, fields.province_id, fields.city_id, fields.district_id, reverseGeocode, applyGeocodeResult]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(labels.locationNotSupported);
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleCoordinateSelect(position.coords.latitude, position.coords.longitude);
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
  }, [handleCoordinateSelect, labels.locationFailed, labels.locationNotSupported, labels.locationPermissionDenied]);

  // Auto-resolve location summary when coordinates are present (edit mode / form reset).
  // Tracks the last resolved coordinate pair so re-opening with a different record
  // (while the component stays mounted) correctly re-fires rather than being blocked
  // by a stale boolean flag.
  const [lastResolvedCoords, setLastResolvedCoords] = useState<string | null>(null);
  const hasCoordinates = latitude != null && longitude != null;
  // Round to 6 dp to avoid floating-point jitter triggering unnecessary re-resolves
  const coordKey = hasCoordinates
    ? `${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`
    : null;

  useEffect(() => {
    if (!coordKey) return;
    if (coordKey === lastResolvedCoords) {
      return; // handleCoordinateSelect already handled this pick
    }

    setLastResolvedCoords(coordKey);
    reverseGeocode.mutate(
      { lat: Number(latitude), lng: Number(longitude) },
      {
        // Always apply unconditionally — same pattern as resolvedSummary.
        // No guards so switching records (or picking a new coord) always
        // overwrites province / city / district with the fresh result.
        onSuccess: applyGeocodeResult,
        onError: (err) => console.error("[LocationPicker] reverseGeocode error", err),
      }
    );
  // Re-run whenever the coordinate key changes (edit mode load or new record)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey]);

  return (
    <div className={className ?? "space-y-4"}>
      {/* Primary: Pick from Map button */}
      {!disabled && (
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer justify-center gap-2"
            onClick={() => setIsMapPickerOpen(true)}
          >
            <MapPin className="h-4 w-4" />
            {labels.pickFromMap}
          </Button>
        </div>
      )}

      {/* Resolved location summary */}
      {reverseGeocode.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {labels.resolving}
        </div>
      )}

      {!reverseGeocode.isPending && resolvedSummary && (
        <p className="text-sm text-muted-foreground px-1">
          {resolvedSummary}
        </p>
      )}

      {!reverseGeocode.isPending && hasCoordinates && (
        <p className="text-xs text-muted-foreground px-1">
          {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
        </p>
      )}

      {!reverseGeocode.isPending && !hasCoordinates && !resolvedSummary && (
        <p className="text-sm text-muted-foreground px-1 italic">
          {labels.noLocation}
        </p>
      )}

      {locationError && <p className="text-sm text-destructive px-1">{locationError}</p>}

      {/* Village (always visible) */}
      <Field orientation="vertical">
        <FieldLabel>{labels.village}</FieldLabel>
        <Controller
          control={control}
          name={fields.village_name}
          render={({ field }) => (
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={labels.villagePlaceholder}
              disabled={disabled}
            />
          )}
        />
      </Field>

      {/* Advanced mode toggle */}
      {!disabled && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {labels.advancedMode}
        </button>
      )}

      {/* Advanced mode: cascading dropdowns */}
      {(showAdvanced || disabled) && (
        <div className="grid grid-cols-2 gap-4">
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
                    if (!val) return; // Radix fires onValueChange("") when value not in item list
                    field.onChange(val);
                    // Only cascade-clear when the user manually changes province;
                    // skip when geocoder sets all three IDs atomically.
                    if (!isProgrammaticChange.current) {
                      setValue(fields.city_id, undefined, { shouldDirty: true });
                      setValue(fields.district_id, undefined, { shouldDirty: true });
                    }
                    // Update resolved names if we can find the province
                    const prov = provinces.find((p) => p.id === val);
                    if (prov) {
                      setResolvedNames((prev) => ({
                        ...prev,
                        province: prov.name,
                        city: undefined,
                        district: undefined,
                      }));
                      // Notify parent — manual dropdown is a user-initiated action
                      if (!isProgrammaticChange.current) {
                        onProvinceChange?.(val, prov.name);
                      }
                    }
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
                    if (!val) return; // Radix fires onValueChange("") when value not in item list
                    field.onChange(val);
                    // Only cascade-clear when the user manually changes city;
                    // skip when geocoder sets all three IDs atomically.
                    if (!isProgrammaticChange.current) {
                      setValue(fields.district_id, undefined, { shouldDirty: true });
                    }
                    const city = cities.find((c) => c.id === val);
                    if (city) {
                      setResolvedNames((prev) => ({
                        ...prev,
                        city: city.name,
                        district: undefined,
                      }));
                    }
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
                        Select province first
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
                    if (!val) return; // Radix fires onValueChange("") when value not in item list
                    field.onChange(val);
                    const dist = districts.find((d) => d.id === val);
                    if (dist) {
                      setResolvedNames((prev) => ({
                        ...prev,
                        district: dist.name,
                      }));
                    }
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
                        Select city first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {/* Latitude */}
          <Field orientation="vertical">
            <FieldLabel>Latitude</FieldLabel>
            <Controller
              control={control}
              name={fields.latitude}
              render={({ field }) => (
                <Input
                  type="number"
                  step="any"
                  placeholder="-6.2088"
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(isNaN(v) ? null : v);
                  }}
                />
              )}
            />
          </Field>

          {/* Longitude */}
          <Field orientation="vertical">
            <FieldLabel>Longitude</FieldLabel>
            <Controller
              control={control}
              name={fields.longitude}
              render={({ field }) => (
                <Input
                  type="number"
                  step="any"
                  placeholder="106.8456"
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(isNaN(v) ? null : v);
                  }}
                />
              )}
            />
          </Field>
        </div>
      )}

      {/* Map picker modal */}
      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? DEFAULT_CENTER[0]}
        longitude={longitude ?? DEFAULT_CENTER[1]}
        onCoordinateSelect={handleCoordinateSelect}
        onUseCurrentLocation={handleUseCurrentLocation}
        useCurrentLocationLabel={labels.useCurrentLocation}
        title={labels.mapPickerTitle}
        description={labels.mapPickerDescription}
      />
    </div>
  );
}
