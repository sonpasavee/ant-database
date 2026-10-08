"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type Leaflet = typeof import("leaflet");

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function pinIcon(L: Leaflet) {
  return L.divIcon({
    className: "pin-icon",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    html: `<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true">
      <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 42 16 42s16-15 16-26.3C32 7 24.8 0 16 0Z" fill="#4a0a11"/>
      <circle cx="16" cy="15.5" r="5.5" fill="#e8b84b"/>
    </svg>`,
  });
}

export default function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  });

  // สร้างแผนที่ครั้งเดียว (import leaflet ตอนอยู่ฝั่ง browser เท่านั้น)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !elRef.current) return;

      leafletRef.current = L;
      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(
        [13.2, 101.0],
        6,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      }).addTo(map);

      map.on("click", (e) => {
        onPickRef.current(round(e.latlng.lat), round(e.latlng.lng));
      });

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
  }, []);

  // sync หมุดกับค่าในช่องละติจูด/ลองจิจูด
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(L) }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [ready, lat, lng]);

  return (
    <div className="map-wrap">
      <div
        ref={elRef}
        className="map-box"
        role="application"
        aria-label="แผนที่ปักหมุดตำแหน่งที่เก็บ"
      />
      <span className="map-hint">คลิกบนแผนที่เพื่อปักหมุด</span>
    </div>
  );
}
