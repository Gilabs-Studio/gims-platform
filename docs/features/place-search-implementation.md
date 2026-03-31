# Place Search Feature - Map Components Enhancement

## Overview

Implementasi fitur **Place Search** menggunakan **Nominatim API** (OpenStreetMap) pada semua map components di GIMS. Fitur ini memungkinkan user untuk mencari lokasi dengan autocomplete, tanpa memerlukan API key eksternal.

## Architecture

### New Files Created

#### 1. **Hook: `use-place-search.ts`**
- Location: `apps/web/src/features/master-data/geographic/hooks/use-place-search.ts`
- Provides:
  - `usePlaceSearch()` - Autocomplete place search dengan debouncing 300ms
  - `useReverseGeocodePlace()` - Reverse geocoding untuk mendapatkan address dari coordinates
  - `reverseGeocodeCoordinate()` - Utility function untuk reverse geocoding langsung
- API: Nominatim OpenStreetMap (gratis, tanpa API key)
- Fitur:
  - Debounced search (300ms delay)
  - Limited to Indonesia (`countrycodes=id`)
  - Max 10 results per search
  - Cache 5 minutes

#### 2. **Component: `place-search-input.tsx`**
- Location: `apps/web/src/components/ui/map/place-search-input.tsx`
- UI untuk place search dengan dropdown hasil
- Features:
  - Search input dengan debouncing
  - Dropdown hasil dengan display name dan coordinates
  - Loading state indicator
  - Empty state handling
- Reusable untuk semua komponen yang membutuhkan place search

#### 3. **Updated: `map-picker-modal.tsx`**
- Ditambahkan:
  - `PlaceSearchInput` component di atas map
  - State untuk handle navigation ke place yang dipilih
  - Function `handlePlaceSelect()` untuk update coordinates dan navigate map
- Flow:
  1. User search lokasi via place search input
  2. Klik pada hasil → coordinates terupdate dan map navigate ke lokasi
  3. User bisa adjust di map atau confirm langsung

#### 4. **Updated: `map-picker-inner.tsx`**
- Ditambahkan prop `navigateToPosition` untuk support navigation
- Enhanced `MapSync` component untuk handle navigation ke lokasi tertentu
- Map otomatis pan & zoom ke lokasi yang dipilih dari place search

### Updated Files

#### i18n Translations
- `apps/web/src/features/master-data/geographic/i18n/en.ts` - English
- `apps/web/src/features/master-data/geographic/i18n/id.ts` - Indonesian

Ditambahkan section `placeSearch` dengan labels:
- `searchPlaceholder`, `searchPlaceholderAdvanced`
- `searchResults`, `noLocationsFound`
- `loadingLocation`, `selectLocation`
- Dan lainnya

## Component Integration Flow

```
Location/Form Components
    ↓
    └─→ LocationPicker / LocationSelector
        ↓
        └─→ MapPickerModal (dibuka via "Pick from Map" button)
            ↓
            ├─→ PlaceSearchInput (NEW - search lokasi)
            │   ↓
            │   └─→ usePlaceSearch hook
            │       ↓
            │       └─→ Nominatim API
            │
            └─→ MapPickerInner
                ├─→ Map display (Leaflet)
                └─→ Coordinates input/picker
```

## Features Breakdown

### 1. **Place Search via Nominatim**
- Gratis, tanpa API key
- Support untuk semua negara (tapi limited ke Indonesia dalam config)
- Keakuratan: 7-8 dari 10 untuk alamat Indonesia

### 2. **Auto-Navigation to Selected Place**
- Setelah select hasil search, map otomatis navigate ke lokasi
- Marker & zoom level automatically adjust
- Coordinates updated in input fields

### 3. **Reverse Geocoding (Existing)**
- Sudah ada, sekarang terintegrasi dengan place search
- Auto-fill administrative boundaries (Province/City/District)

### 4. **Manual Coordinate Input**
- User bisa manual input latitude/longitude
- Map akan navigate ke koordinat yang di-input
- Validate range: Lat [-90, 90], Lon [-180, 180]

## Usage Examples

### Example 1: In LocationPicker Component
```tsx
<LocationPicker
  control={form.control}
  setValue={form.setValue}
  fieldNames={{
    province_id: "province_id",
    city_id: "city_id",
    district_id: "district_id",
    village_name: "village_name",
    latitude: "latitude",
    longitude: "longitude",
  }}
/>
```

Fitur place search sudah terintegrasi via MapPickerModal yang dibuka ketika user click "Pick from Map" button.

### Example 2: In Lead Detail Form
```tsx
<MapPickerModal
  open={showMapPicker}
  onOpenChange={setShowMapPicker}
  latitude={lead.latitude ?? 0}
  longitude={lead.longitude ?? 0}
  onCoordinateSelect={handleLocationSave}
  title={t("pickLocation")}
  description={t("pickLocationDesc")}
/>
```

Place search sudah tersedia di modal untuk quick location selection.

## API Reference

### Hook: `usePlaceSearch()`

```typescript
const {
  searchQuery,        // Current search string
  searchResults,      // Array<PlaceSearchResult>
  isSearching,       // Loading state
  handleSearch,      // (query: string) => void
} = usePlaceSearch();
```

**PlaceSearchResult** structure:
```typescript
{
  id: string;
  name: string;              // First part of display_name
  display_name: string;      // Full address
  lat: number;
  lon: number;
  type: string;              // place type (house, restaurant, etc.)
  importance?: number;       // Result relevance score
  address?: {                // Administrative hierarchy
    village?: string;
    town?: string;
    city?: string;
    district?: string;
    province?: string;
    postcode?: string;
    country?: string;
  }
}
```

### Utility Function: `reverseGeocodeCoordinate()`

```typescript
const result = await reverseGeocodeCoordinate(lat, lon);
// Returns PlaceSearchResult | null
```

## i18n Keys

Available in both English & Indonesian:

```typescript
t("geographic.placeSearch.searchPlaceholder")
t("geographic.placeSearch.searchResults")
t("geographic.placeSearch.noLocationsFound")
t("geographic.placeSearch.loadingLocation")
t("geographic.placeSearch.selectLocation")
t("geographic.placeSearch.pickFromMap")
t("geographic.placeSearch.useCurrentLocation")
t("geographic.placeSearch.confirmLocation")
t("geographic.placeSearch.mapPickerTitle")
t("geographic.placeSearch.mapPickerDescription")
t("geographic.placeSearch.searchVia")
t("geographic.placeSearch.latitude")
t("geographic.placeSearch.longitude")
```

## Performance Considerations

1. **Debouncing**: 300ms delay untuk minimize API calls
2. **Caching**: TanStack Query cache 5 minutes per search query
3. **Pagination**: Limited to 10 results per search
4. **Geographic Limit**: Only Indonesia (`countrycodes=id`)

## Limitations & Future Improvements

### Current Limitations
1. Search limited ke Indonesia (by design untuk fokus)
2. Max 10 results per search
3. Nominatim rate-limited (free tier: 1 request/second)

### Future Improvements
1. **Google Places Integration**: Optional dengan API key
   - Foto tempat & opening hours
   - Rating & reviews
   - Business details
   
2. **Place Categories**: Filter by type (restaurant, hotel, bank, etc.)

3. **Search History**: Save recent searches

4. **Advanced Filters**:
   - Search dalam radius tertentu
   - Filter berdasarkan business type
   - Custom geographic boundary

5. **Offline Support**: Cache popular locations

## Dependencies

- `@tanstack/react-query` - untuk data fetching & caching
- `react-leaflet` - untuk map display (existing)
- `leaflet` - base map library (existing)
- Nominatim API - free, no key required

## Testing Checklist

- [ ] Place search UI muncul di map picker modal
- [ ] Search query debouncing berfungsi (wait 300ms sebelum API call)
- [ ] Hasil search menampilkan dengan benar
- [ ] Click hasil → map navigate ke lokasi
- [ ] Coordinates terupdate saat select place
- [ ] Manual lat/lon input tetap berfungsi
- [ ] "Use Current Location" button tetap berfungsi
- [ ] Reverse geocoding (address → province/city/district) tetap jalan
- [ ] i18n labels muncul dengan benar (both EN & ID)
- [ ] Loading state indicator visible saat searching
- [ ] Empty state message saat no results
- [ ] Mobile responsiveness (dropdown tetap visible & usable)

## Files Structure

```
apps/web/src/
├── components/ui/map/
│   ├── map-picker-modal.tsx (UPDATED)
│   ├── map-picker-inner.tsx (UPDATED)
│   ├── place-search-input.tsx (NEW)
│   ├── map-picker.tsx
│   ├── map-view.tsx
│   └── ...
├── features/master-data/geographic/
│   ├── hooks/
│   │   ├── use-place-search.ts (NEW)
│   │   ├── use-reverse-geocode.ts (existing)
│   │   └── ...
│   ├── components/
│   │   ├── location-picker.tsx (uses MapPickerModal)
│   │   ├── location-selector.tsx
│   │   └── ...
│   └── i18n/
│       ├── en.ts (UPDATED)
│       └── id.ts (UPDATED)
```

## API Rate Limiting

Nominatim free tier:
- 1 request per second
- 10,000 requests per day limit
- Recommended for production: use Nominatim commercial plan or self-host

Current implementation includes:
- TanStack Query caching (5 min)
- Debouncing (300ms)
- Should be sufficient untuk typical usage

## Notes

- Place search tidak menggantikan cascading dropdown (province/city/district) - hanya melengkapi
- Reverse geocoding otomatis fill administrative fields saat user select dari map
- All components bersifat "client-side" - no backend changes needed
- SSR-safe: dynamic imports untuk map components
