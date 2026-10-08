"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export default function RecordMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !elRef.current) return;

      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        keyboard: true,
      }).setView([lat, lng], 14);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
        className: "rd-pin",
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        html: `<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true">
          <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 42 16 42s16-15 16-26.3C32 7 24.8 0 16 0Z" fill="#4a0a11"/>
          <circle cx="16" cy="15.5" r="5.5" fill="#e8b84b"/>
        </svg>`,
      });
      L.marker([lat, lng], { icon, title: label, alt: label }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={elRef}
      className="rd-map"
      role="application"
      aria-label={`แผนที่ตำแหน่งที่เก็บ: ${label}`}
    />
  );
}
