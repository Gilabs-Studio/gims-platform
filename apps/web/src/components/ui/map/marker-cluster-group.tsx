"use client";

import { createPathComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";


interface MarkerClusterGroupProps extends L.MarkerClusterGroupOptions {
  children?: React.ReactNode;
}

const MarkerClusterGroup = createPathComponent<L.MarkerClusterGroup, MarkerClusterGroupProps>(
  ({ children: _c, ...props }, ctx) => {
    const instance = new L.MarkerClusterGroup({
      chunkedLoading: true,
      ...props,
    });

    return {
      instance,
      context: { ...ctx, layerContainer: instance },
    };
  }
);

export default MarkerClusterGroup;
