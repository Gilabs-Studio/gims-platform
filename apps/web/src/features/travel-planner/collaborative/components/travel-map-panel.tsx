"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Marker, Popup, Polyline } from "react-leaflet";

import { MapView, MarkerClusterGroup, type MapMarker } from "@/components/ui/map/map-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TravelPlanDay, TravelPlanStop } from "../types";

interface TravelMapPanelProps {
  readonly days: TravelPlanDay[];
  readonly selectedDayIndex: number;
  readonly selectedCategories: string[];
  readonly onToggleCategory: (category: string) => void;
}

interface StopMarkerData {
  stop: TravelPlanStop;
  dayIndex: number;
}

export function TravelMapPanel({
  days,
  selectedDayIndex,
  selectedCategories,
  onToggleCategory,
}: TravelMapPanelProps) {
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.day_index - b.day_index),
    [days],
  );

  const activeDay = sortedDays.find((day) => day.day_index === selectedDayIndex) ?? sortedDays[0];

  const categoryOptions = useMemo(() => {
    const categorySet = new Set<string>();
    for (const day of sortedDays) {
      for (const stop of day.stops) {
        categorySet.add(stop.category);
      }
    }
    return [...categorySet];
  }, [sortedDays]);

  const filteredStops = useMemo(() => {
    if (!activeDay) {
      return [];
    }
    return activeDay.stops.filter((stop) => selectedCategories.includes(stop.category));
  }, [activeDay, selectedCategories]);

  const markers = useMemo<MapMarker<StopMarkerData>[]>(() => {
    return filteredStops.map((stop) => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      data: {
        stop,
        dayIndex: activeDay?.day_index ?? selectedDayIndex,
      },
    }));
  }, [activeDay?.day_index, filteredStops, selectedDayIndex]);

  const pathPositions = useMemo<[number, number][]>(() => {
    return [...filteredStops]
      .sort((a, b) => a.order_index - b.order_index)
      .map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  }, [filteredStops]);

  const renderMarkers = (mapMarkers: MapMarker<StopMarkerData>[]) => {
    return (
      <>
        <MarkerClusterGroup>
          {mapMarkers.map((marker) => {
            const stop = marker.data.stop;
            return (
              <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
                <Popup>
                  <div className="w-64 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{stop.place_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {stop.category}
                      </Badge>
                    </div>
                    {stop.photo_url ? (
                      <Image
                        src={stop.photo_url}
                        alt={stop.place_name}
                        width={256}
                        height={96}
                        unoptimized
                        className="h-24 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <p className="text-xs text-muted-foreground">{stop.note || "No note"}</p>
                    <p className="text-xs text-muted-foreground">
                      {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {pathPositions.length > 1 ? <Polyline positions={pathPositions} /> : null}
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Interactive Map</CardTitle>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((category) => {
            const active = selectedCategories.includes(category);
            return (
              <Button
                key={category}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                className="h-7 cursor-pointer"
                onClick={() => onToggleCategory(category)}
              >
                {category}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 rounded-lg overflow-hidden border bg-muted">
          <MapView
            markers={markers}
            renderMarkers={renderMarkers}
            className="h-full"
            defaultCenter={[-6.2088, 106.8456]}
            defaultZoom={6}
            showLayerControl
          />
        </div>
      </CardContent>
    </Card>
  );
}
