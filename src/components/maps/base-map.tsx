"use client";
import "leaflet/dist/leaflet.css";
import "./leaflet-fix"; // apply icon fix
import { MapContainer, TileLayer } from "react-leaflet";

type BaseMapProps = {
  center?: [number, number];
  zoom?: number;
  height?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function BaseMap({
  center = [39.3999, -8.2245], // Portugal center
  zoom = 7,
  height = "100%",
  children,
  className,
}: BaseMapProps) {
  return (
    <div style={{ height }} className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
