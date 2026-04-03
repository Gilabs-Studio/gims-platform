"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Marker } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  getMapContainerOptions,
  resolveMapTileLayer,
  type MapProfile,
} from "./map-config";

// Fix missing marker icons — static imports ensure icons are available
// before any Marker renders (same approach as map-inner.tsx)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Turbopack may return a plain string or a StaticImageData object for PNG imports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getImageSrc = (img: any): string => {
  if (typeof img === "string" && img) return img;
  if (typeof img?.src === "string" && img.src) return img.src;
  if (typeof img?.default === "string" && img.default) return img.default;
  if (typeof img?.default?.src === "string" && img.default.src) return img.default.src;
  return "";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: getImageSrc(markerIcon),
  iconRetinaUrl: getImageSrc(markerIcon2x),
  shadowUrl: getImageSrc(markerShadow),
});

interface MapPickerInnerProps {
  readonly initialPosition: [number, number];
  readonly onCoordinateSelect: (lat: number, lng: number) => void;
  readonly defaultZoom?: number;
  readonly navigateToPosition?: [number, number] | null;
  readonly mapProfile?: MapProfile;
}

/**
 * Syncs the map view when the initial position changes (e.g. dialog re-opens
 * at a different location). Also handles navigation to a specific position
 * when a place is selected from search results.
 */
function MapSync({
  position,
  defaultZoom,
  navigateToPosition,
}: {
  readonly position: [number, number];
  readonly defaultZoom: number;
  readonly navigateToPosition?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    // Priority: navigate to search result, then sync initial position
    const targetPosition = navigateToPosition || position;
    map.setView(targetPosition, map.getZoom() !== defaultZoom ? map.getZoom() : defaultZoom);
  }, [map, position, defaultZoom, navigateToPosition]);

  return null;
}

/**
 * Handles click-to-place and drag-to-move for coordinate picking.
 * Rendered inside MapContainer — uses static Leaflet icon fix above.
 */
function ClickHandler({
  initialPosition,
  onCoordinateSelect,
}: MapPickerInnerProps) {
  const map = useMap();
  const [markerPosition, setMarkerPosition] =
    useState<[number, number]>(initialPosition);

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setMarkerPosition([lat, lng]);
      onCoordinateSelect(lat, lng);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onCoordinateSelect]);

  useEffect(() => {
    setMarkerPosition(initialPosition);
  }, [initialPosition]);

  return (
    <Marker
      position={markerPosition}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          setMarkerPosition([pos.lat, pos.lng]);
          onCoordinateSelect(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export default function MapPickerInner({
  initialPosition,
  onCoordinateSelect,
  defaultZoom = 13,
  navigateToPosition = null,
  mapProfile = "driver",
}: MapPickerInnerProps) {
  // Delay rendering interactive children until the map reports ready.
  // This prevents React StrictMode's double-invoke from attempting to add/
  // remove a Marker before the Leaflet map is fully initialised, which
  // causes both the "iconUrl not set" and "_leaflet_events" errors.
  const [mapReady, setMapReady] = useState(false);
  const tileLayer = resolveMapTileLayer("light", null);
  const mapContainerOptions = getMapContainerOptions(mapProfile);

  return (
    <MapContainer
      center={navigateToPosition || initialPosition}
      zoom={defaultZoom}
      className="h-full w-full"
      scrollWheelZoom={mapContainerOptions.scrollWheelZoom}
      touchZoom={mapContainerOptions.touchZoom}
      doubleClickZoom={mapContainerOptions.doubleClickZoom}
      dragging={mapContainerOptions.dragging}
      zoomControl={mapContainerOptions.zoomControl}
      preferCanvas={mapContainerOptions.preferCanvas}
      whenReady={() => setMapReady(true)}
    >
      <TileLayer
        attribution={tileLayer.attribution}
        url={tileLayer.url}
      />
      {mapReady && (
        <>
          <MapSync
            position={initialPosition}
            defaultZoom={defaultZoom}
            navigateToPosition={navigateToPosition}
          />
          <ClickHandler
            initialPosition={initialPosition}
            onCoordinateSelect={onCoordinateSelect}
          />
        </>
      )}
    </MapContainer>
  );
}
