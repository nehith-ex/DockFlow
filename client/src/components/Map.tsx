import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export interface MapMarker {
  id: string;
  label: string;
  position: { lat: number; lng: number };
  title?: string;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers?: MapMarker[];
  activeMarkerId?: string;
  routePath?: { lat: number; lng: number }[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapReady?: (map: LeafletMap) => void;
}

const INDIA_BOUNDS: [[number, number], [number, number]] = [[6, 67], [37, 98]];
const INDIA_BOUNDARY_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/IND.geo.json";

function MapReady({ onMapReady }: { onMapReady?: (map: LeafletMap) => void }) {
  const map = useMap();
  onMapReady?.(map);
  return null;
}

function portIcon(marker: MapMarker, active: boolean) {
  return L.divIcon({
    className: "dockflow-leaflet-marker-wrapper",
    html: `<span class="dockflow-leaflet-marker${active ? " is-active" : ""}"><em>${marker.title ?? marker.label}</em></span>`,
    iconSize: [180, 30],
    iconAnchor: [0, 15],
  });
}

export function MapView({
  className,
  initialCenter = { lat: 18, lng: 82 },
  initialZoom = 5,
  markers = [],
  activeMarkerId,
  routePath = [],
  onMarkerClick,
  onMapReady,
}: MapViewProps) {
  const markerItems = useMemo(() => markers.filter(marker => marker.label.trim() && marker.title?.trim()).filter((marker, index, items) => items.findIndex(item => item.id === marker.id) === index).slice(0, 4), [markers]);
  const route = useMemo(() => routePath.map(point => [point.lat, point.lng] as [number, number]), [routePath]);
  const [indiaBoundary, setIndiaBoundary] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(INDIA_BOUNDARY_URL, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) setIndiaBoundary(data as GeoJsonObject); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return <div className={cn("relative w-full h-[252px]", className)}>
    <MapContainer
      key={markerItems.map(marker => marker.id).join("|")}
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={initialZoom}
      bounds={INDIA_BOUNDS}
      maxBounds={[[0, 63], [40, 103]]}
      minZoom={4}
      scrollWheelZoom
      zoomControl
      className="h-full w-full bg-[#07111c]"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {indiaBoundary && <>
        <GeoJSON data={indiaBoundary} style={{ color: "#ffffff", weight: 6, opacity: 0.24, fill: false }} />
        <GeoJSON data={indiaBoundary} style={{ color: "#ffffff", weight: 1.8, opacity: 0.98, fill: false }} />
      </>}
      <MapReady onMapReady={onMapReady} />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#ff4d43", weight: 2.5, opacity: 0.95, dashArray: "8 7", lineCap: "round" }} />}
      {markerItems.map(marker => <Marker
        key={marker.id}
        position={[marker.position.lat, marker.position.lng]}
        icon={portIcon(marker, marker.id === activeMarkerId)}
        eventHandlers={{ click: () => onMarkerClick?.(marker) }}
      >
      </Marker>)}
    </MapContainer>
    <div className="dockflow-map-compass" aria-label="North"><span>N</span><i /></div>
    <div className="dockflow-map-title">MAJOR PORTS</div>
  </div>;
}
