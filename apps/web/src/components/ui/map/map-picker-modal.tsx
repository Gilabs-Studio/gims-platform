"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// Component untuk handle map click dan marker drag (must be inside MapContainer)
// This must be a separate file or use a different approach
const MapClickHandler = dynamic(
  () => import("./map-click-handler").then((mod) => mod.MapClickHandler),
  { ssr: false }
);

// Default location: Jakarta, Indonesia
const DEFAULT_LOCATION: [number, number] = [-6.2088, 106.8456];

interface MapPickerModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly latitude: number;
  readonly longitude: number;
  readonly onCoordinateSelect: (latitude: number, longitude: number) => void;
  readonly title?: string;
  readonly description?: string;
}

export function MapPickerModal({
  open,
  onOpenChange,
  latitude,
  longitude,
  onCoordinateSelect,
  title = "Select Location",
  description = "Click on the map or drag the marker to set the location coordinates",
}: MapPickerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentLat, setCurrentLat] = useState(latitude || DEFAULT_LOCATION[0]);
  const [currentLng, setCurrentLng] = useState(longitude || DEFAULT_LOCATION[1]);

  // Setup Leaflet CSS and icon only on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Import CSS dynamically
    // @ts-expect-error - CSS import for Leaflet
    void import("leaflet/dist/leaflet.css");
    
    // Setup Leaflet icon using direct paths from CDN
    void import("leaflet").then((L) => {
      const DefaultIcon = L.default.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      
      L.default.Marker.prototype.options.icon = DefaultIcon;
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentLat(latitude || DEFAULT_LOCATION[0]);
      setCurrentLng(longitude || DEFAULT_LOCATION[1]);
    }
  }, [open, latitude, longitude]);

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
  };

  const handleConfirm = () => {
    onCoordinateSelect(currentLat, currentLng);
    onOpenChange(false);
  };

  if (!mounted) {
    return null;
  }

  const initialPosition: [number, number] = [currentLat, currentLng];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-0 sm:pt-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 sm:px-0">
          <div className="h-[300px] sm:h-[500px] rounded-md border overflow-hidden relative">
            <MapContainer
              center={initialPosition}
              zoom={13}
              className="h-full w-full"
              scrollWheelZoom={true}
              touchZoom={true}
              doubleClickZoom={true}
              dragging={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler
                onCoordinateSelect={handleCoordinateSelect}
                initialPosition={initialPosition}
              />
            </MapContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Latitude</label>
              <input
                type="number"
                step="any"
                value={currentLat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setCurrentLat(val);
                  }
                }}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Longitude</label>
              <input
                type="number"
                step="any"
                value={currentLng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setCurrentLng(val);
                  }
                }}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:px-0 sm:pb-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <MapPin className="h-4 w-4 mr-2" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
