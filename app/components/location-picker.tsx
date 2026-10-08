"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type Leaflet = typeof import("leaflet");
type PlaceResult = { label: string; latitude: number; longitude: number };

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
  onPlaceSelect,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  onPlaceSelect?: (lat: number, lng: number, label: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const onPickRef = useRef(onPick);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRequest = useRef(0);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    onPickRef.current = onPick;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  async function searchPlaces() {
    const value = query.trim();
    searchAbort.current?.abort();
    const requestId = ++searchRequest.current;
    if (value.length < 3) {
      setSearchError("พิมพ์อย่างน้อย 3 ตัวอักษรก่อนค้นหา");
      setShowResults(true);
      return;
    }

    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setShowResults(true);
    try {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      const payload = await response.json() as {
        results?: PlaceResult[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "ค้นหาสถานที่ไม่สำเร็จ");
      if (requestId === searchRequest.current) setResults(payload.results ?? []);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (requestId === searchRequest.current) {
        setSearchError(error instanceof Error
          ? error.message
          : "ค้นหาสถานที่ไม่ได้ กรุณาลองใหม่หรือปักหมุดบนแผนที่");
      }
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }

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
      <div className="place-search">
        <label className="field-label" htmlFor="map-place-search">ค้นหาสถานที่ในประเทศไทย</label>
        <div className="place-search-row">
          <input
            id="map-place-search"
            className="input"
            type="search"
            value={query}
            onChange={(event) => {
              searchAbort.current?.abort();
              searchRequest.current += 1;
              setQuery(event.target.value);
              setResults([]);
              setSearching(false);
              setSearchError("");
              setShowResults(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowResults(false);
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void searchPlaces();
              }
            }}
            maxLength={120}
            autoComplete="off"
            placeholder="เช่น เขาใหญ่, ดอยอินทนนท์, ชื่อจังหวัด"
            aria-controls="map-place-results"
          />
          <button
            className="btn btn-soft place-search-button"
            type="button"
            onClick={() => void searchPlaces()}
            disabled={searching || query.trim().length < 3}
          >
            {searching ? "กำลังค้นหา…" : "ค้นหา"}
          </button>
        </div>
        {query.trim().length > 0 && query.trim().length < 3 && (
          <small className="place-search-note">พิมพ์อย่างน้อย 3 ตัวอักษร</small>
        )}
        {showResults && (query.trim().length >= 3 || searchError) && (
          <div id="map-place-results" className="place-search-results" role="listbox" aria-label="ผลการค้นหาสถานที่">
            {searching && <p className="place-search-message" role="status">กำลังค้นหา…</p>}
            {!searching && searchError && <p className="place-search-message" role="status">{searchError}</p>}
            {!searching && !searchError && results.length === 0 && query.trim().length >= 3 && <p className="place-search-message">ไม่พบสถานที่ ลองใช้คำค้นอื่นหรือคลิกบนแผนที่</p>}
            {!searching && results.map((result, index) => (
              <button
                key={`${result.latitude}:${result.longitude}:${index}`}
                className="place-search-option"
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  setQuery(result.label);
                  setShowResults(false);
                  setResults([]);
                  if (onPlaceSelectRef.current) {
                    onPlaceSelectRef.current(result.latitude, result.longitude, result.label);
                  } else {
                    onPickRef.current(result.latitude, result.longitude);
                  }
                }}
              >
                {result.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
