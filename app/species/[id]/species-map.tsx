"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

type MapRecord = {
  id: string;
  amount: number;
  collectedAt: string;
  collectionMethod: string | null;
};

export type SpeciesMapLocation = {
  id: number;
  name: string;
  province: string | null;
  latitude: number;
  longitude: number;
  recordCount: number;
  records: MapRecord[];
};

type LocationGroup = {
  latitude: number;
  longitude: number;
  recordCount: number;
  locations: SpeciesMapLocation[];
};

function createPopupContent(
  L: typeof import("leaflet"),
  group: LocationGroup,
) {
  const container = L.DomUtil.create("div", "species-map-popup");
  const heading = L.DomUtil.create("strong", "species-map-popup-heading", container);
  heading.textContent = `${group.recordCount.toLocaleString("th-TH")} บันทึก · ${group.locations.length.toLocaleString("th-TH")} สถานที่`;

  for (const location of group.locations) {
    const section = L.DomUtil.create("section", "species-map-popup-location", container);
    const placeHeading = L.DomUtil.create("h3", "", section);
    placeHeading.textContent = [location.name, location.province].filter(Boolean).join(", ");
    const count = L.DomUtil.create("p", "species-map-popup-count", section);
    count.textContent = `${location.recordCount.toLocaleString("th-TH")} บันทึก`;

    const list = L.DomUtil.create("ul", "", section);
    for (const record of location.records) {
      const item = L.DomUtil.create("li", "", list);
      const link = L.DomUtil.create("a", "", item);
      link.href = `/records/${encodeURIComponent(record.id)}`;
      link.textContent = `${new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "Asia/Bangkok",
      }).format(new Date(record.collectedAt))} · ${record.amount.toLocaleString("th-TH")} ตัว${record.collectionMethod ? ` · ${record.collectionMethod}` : ""}`;
    }
    if (location.recordCount > location.records.length) {
      const more = L.DomUtil.create("li", "species-map-popup-more", list);
      more.textContent = `และอีก ${(location.recordCount - location.records.length).toLocaleString("th-TH")} บันทึก`;
    }
  }

  return container;
}

export default function SpeciesMap({ locations }: { locations: SpeciesMapLocation[] }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (locations.length === 0 || !elementRef.current) return;
    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !elementRef.current) return;

        map = L.map(elementRef.current, {
          scrollWheelZoom: false,
          keyboard: true,
        });
        mapRef.current = map;

        const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);
        tileLayer.on("tileerror", () => {
          if (!cancelled) setMapError("โหลดแผนที่พื้นหลังไม่สำเร็จ แต่ยังดูตำแหน่งและรายละเอียดจุดได้");
        });

        const grouped = new Map<string, LocationGroup>();
        for (const location of locations) {
          const key = `${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}`;
          const group = grouped.get(key);
          if (group) {
            group.locations.push(location);
            group.recordCount += location.recordCount;
          } else {
            grouped.set(key, {
              latitude: location.latitude,
              longitude: location.longitude,
              recordCount: location.recordCount,
              locations: [location],
            });
          }
        }

        const markers = L.featureGroup();
        for (const group of grouped.values()) {
          const label = `${group.recordCount.toLocaleString("th-TH")} บันทึก · ${group.locations.map((location) => location.name).join(", ")}`;
          const icon = L.divIcon({
            className: "species-map-marker-shell",
            html: `<span class="species-map-marker">${group.recordCount.toLocaleString("th-TH")}</span>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          });
          L.marker([group.latitude, group.longitude], {
            icon,
            title: label,
            alt: label,
            keyboard: true,
          })
            .bindPopup(createPopupContent(L, group), { maxWidth: 340 })
            .addTo(markers);
        }

        markers.addTo(map);
        if (grouped.size === 1) {
          const first = grouped.values().next().value;
          if (first) map.setView([first.latitude, first.longitude], 13);
        } else {
          map.fitBounds(markers.getBounds(), { padding: [32, 32], maxZoom: 13 });
        }
      } catch (error) {
        console.error("Unable to initialize species observation map", error);
        if (!cancelled) setMapError("เปิดแผนที่ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่");
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="species-map-empty" role="status">
        ยังไม่มีบันทึกของชนิดนี้ที่มีพิกัดสถานที่ จึงยังแสดงจุดบนแผนที่ไม่ได้
      </div>
    );
  }

  return (
    <div className="species-map-wrap">
      {mapError && <p className="species-map-error" role="status">{mapError}</p>}
      <div
        ref={elementRef}
        className="species-map"
        role="application"
        aria-label="แผนที่แสดงสถานที่ที่พบมดชนิดนี้ กดหมุดเพื่อดูบันทึก"
      />
      <p className="species-map-hint">เลือกหมุดเพื่อดูสถานที่ จำนวนบันทึก และวันที่สำรวจ · ลากแผนที่เพื่อเลื่อน และใช้ปุ่ม +/− เพื่อซูม</p>
    </div>
  );
}
