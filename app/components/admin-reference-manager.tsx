"use client";

import { useMemo, useState, type FormEvent } from "react";
import "./admin-reference-manager.css";
import LocationPicker from "./location-picker";

type Species = {
  id: number;
  commonName: string;
  scientificName: string;
  aliases: { id?: number; name: string }[];
  genus: string | null;
  family: string | null;
};
type Location = {
  id: number;
  name: string;
  province: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
type Method = { id: number; name: string };
type Data = { species: Species[]; locations: Location[]; methods: Method[] };
type Tab = "species" | "locations" | "methods";

const tabs: { id: Tab; label: string; singular: string; icon: string }[] = [
  { id: "species", label: "ชนิดมด", singular: "ชนิดมด", icon: "🐜" },
  { id: "locations", label: "สถานที่", singular: "สถานที่", icon: "📍" },
  { id: "methods", label: "วิธีเก็บ", singular: "วิธีเก็บ", icon: "🧪" },
];

function parseCoord(text: string, min: number, max: number): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default function AdminReferenceManager({
  initialData,
}: {
  initialData: Data;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("species");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");

  const lat = parseCoord(latText, -90, 90);
  const lng = parseCoord(lngText, -180, 180);
  const hasCoords = lat != null && lng != null;
  const currentTab = tabs.find((tab) => tab.id === activeTab)!;

  function pick(nextLat: number, nextLng: number) {
    setLatText(String(nextLat));
    setLngText(String(nextLng));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setMessage("");
    setError("");

    if (activeTab === "locations" && !hasCoords) {
      setError(
        "กรุณาปักหมุดบนแผนที่ หรือกรอกละติจูด/ลองจิจูดให้ถูกต้องก่อนบันทึก",
      );
      return;
    }
    setBusy(true);

    const payload: Record<string, string | string[] | number> =
      Object.fromEntries(
        [...values.entries()]
          .map(([key, value]) => [key, String(value).trim()] as const)
          .filter(([, value]) => value !== ""),
      );
    if (activeTab === "species" && typeof payload.aliases === "string") {
      payload.aliases = [
        ...new Set(
          payload.aliases
            .split(/[\n,]/)
            .map((name) => name.trim())
            .filter(Boolean),
        ),
      ];
    }
    if (activeTab === "locations" && lat != null && lng != null) {
      payload.latitude = lat;
      payload.longitude = lng;
    }
    const endpoint = {
      species: "/api/species",
      locations: "/api/locations",
      methods: "/api/collection-methods",
    }[activeTab];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.message ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่",
        );
      }

      const item = result.data;
      if (activeTab === "species") {
        setData((current) => ({
          ...current,
          species: [...current.species, item].sort((a, b) =>
            a.commonName.localeCompare(b.commonName, "th"),
          ),
        }));
      } else if (activeTab === "locations") {
        setData((current) => ({
          ...current,
          locations: [...current.locations, item].sort((a, b) =>
            a.name.localeCompare(b.name, "th"),
          ),
        }));
      } else {
        setData((current) => ({
          ...current,
          methods: [...current.methods, item].sort((a, b) =>
            a.name.localeCompare(b.name, "th"),
          ),
        }));
      }

      form.reset();
      setLatText("");
      setLngText("");
      setMessage(`เพิ่ม${currentTab.singular}เรียบร้อยแล้ว`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setBusy(false);
    }
  }

  const counts = {
    species: data.species.length,
    locations: data.locations.length,
    methods: data.methods.length,
  };

  const q = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    const has = (...parts: (string | null | undefined)[]) =>
      !q || parts.some((p) => p?.toLowerCase().includes(q));
    return {
      species: data.species.filter((s) =>
        has(
          s.commonName,
          s.scientificName,
          s.genus,
          s.family,
          ...s.aliases.map((a) => a.name),
        ),
      ),
      locations: data.locations.filter((l) => has(l.name, l.province)),
      methods: data.methods.filter((m) => has(m.name)),
    };
  }, [data, q]);
  const visibleCount = visible[activeTab].length;

  return (
    <section className="container section admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">พื้นที่ผู้ดูแลระบบ</p>
          <h1>จัดการข้อมูลอ้างอิง</h1>
          <p>
            เพิ่มชนิดมด สถานที่ และวิธีเก็บ
            เพื่อให้พร้อมใช้ในแบบฟอร์มบันทึกข้อมูล
          </p>
        </div>
      </div>

      <div className="admin-summary" aria-label="จำนวนข้อมูลอ้างอิง">
        {tabs.map((tab) => (
          <div className="admin-summary-card" key={tab.id}>
            <span className="admin-summary-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <div>
              <span>{tab.label}</span>
              <strong>{counts[tab.id].toLocaleString("th-TH")}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-reference-layout">
        <nav className="admin-tabs" aria-label="ประเภทข้อมูลที่จัดการ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={busy}
              className={
                activeTab === tab.id ? "admin-tab active" : "admin-tab"
              }
              onClick={() => {
                setActiveTab(tab.id);
                setMessage("");
                setError("");
                setFilter("");
              }}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className="admin-tab-label">
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </span>
              <span className="admin-tab-count">{counts[tab.id]}</span>
            </button>
          ))}
        </nav>

        <div className="admin-reference-content">
          <section className="card admin-create-card">
            <div className="admin-card-title">
              <span className="admin-card-icon" aria-hidden="true">
                {currentTab.icon}
              </span>
              <div>
                <h2>เพิ่ม{currentTab.singular}</h2>
                <p className="muted-sm">
                  ข้อมูลใหม่นี้จะปรากฏในตัวเลือกของแบบฟอร์มเพิ่มข้อมูลมด
                </p>
              </div>
            </div>

            <form className="admin-create-form" onSubmit={handleSubmit}>
              {activeTab === "species" && (
                <>
                  <div className="field">
                    <label htmlFor="species-common-name">
                      ชื่อสามัญ <span className="req">*</span>
                    </label>
                    <input
                      id="species-common-name"
                      className="input"
                      name="commonName"
                      required
                      maxLength={150}
                      placeholder="เช่น มดแดง"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="species-scientific-name">
                      ชื่อวิทยาศาสตร์ <span className="req">*</span>
                    </label>
                    <input
                      id="species-scientific-name"
                      className="input input-italic"
                      name="scientificName"
                      required
                      maxLength={200}
                      placeholder="เช่น Oecophylla smaragdina"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="species-aliases">ชื่อเรียกอื่น</label>
                    <textarea
                      id="species-aliases"
                      className="input textarea"
                      name="aliases"
                      rows={3}
                      placeholder="หนึ่งชื่อต่อบรรทัด หรือคั่นด้วยจุลภาค"
                    />
                    <p className="field-hint">
                      ชื่อเรียกทั้งหมดจะชี้ไปยังชนิดเดียวกัน ไม่สร้าง species
                      ซ้ำ
                    </p>
                  </div>
                  <div className="admin-form-row">
                    <div className="field">
                      <label htmlFor="species-genus">สกุล (Genus)</label>
                      <input
                        id="species-genus"
                        className="input"
                        name="genus"
                        maxLength={100}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="species-family">วงศ์ (Family)</label>
                      <input
                        id="species-family"
                        className="input"
                        name="family"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "locations" && (
                <>
                  <div className="field">
                    <label htmlFor="location-name">
                      ชื่อสถานที่ <span className="req">*</span>
                    </label>
                    <input
                      id="location-name"
                      className="input"
                      name="name"
                      required
                      maxLength={200}
                      placeholder="เช่น สวนสาธารณะบึงแก่นนคร"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="location-province">จังหวัด</label>
                    <input
                      id="location-province"
                      className="input"
                      name="province"
                      maxLength={100}
                      placeholder="เช่น ขอนแก่น"
                    />
                  </div>

                  <div className="field">
                    <label>
                      พิกัดบนแผนที่ <span className="req">*</span>
                    </label>
                    <LocationPicker lat={lat} lng={lng} onPick={pick} />
                  </div>
                  <div className="admin-form-row">
                    <div className="field">
                      <label htmlFor="location-lat">ละติจูด (Latitude)</label>
                      <input
                        id="location-lat"
                        className="input coord-input"
                        inputMode="decimal"
                        value={latText}
                        onChange={(e) => setLatText(e.target.value)}
                        placeholder="เช่น 16.474500"
                        aria-invalid={latText !== "" && lat == null}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="location-lng">ลองจิจูด (Longitude)</label>
                      <input
                        id="location-lng"
                        className="input coord-input"
                        inputMode="decimal"
                        value={lngText}
                        onChange={(e) => setLngText(e.target.value)}
                        placeholder="เช่น 102.822800"
                        aria-invalid={lngText !== "" && lng == null}
                      />
                    </div>
                  </div>
                  <p className="field-hint">
                    คลิก/ลากหมุดบนแผนที่ หรือพิมพ์พิกัดเองก็ได้ (ละติจูด -90 ถึง
                    90, ลองจิจูด -180 ถึง 180)
                  </p>
                </>
              )}

              {activeTab === "methods" && (
                <div className="field">
                  <label htmlFor="method-name">
                    ชื่อวิธีเก็บ <span className="req">*</span>
                  </label>
                  <input
                    id="method-name"
                    className="input"
                    name="name"
                    required
                    maxLength={150}
                    placeholder="เช่น Pitfall trap"
                  />
                </div>
              )}

              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="alert alert-ok" role="status">
                  {message}
                </p>
              )}
              <div className="admin-form-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "กำลังบันทึก…" : "＋ เพิ่มข้อมูล"}
                </button>
              </div>
            </form>
          </section>

          <section className="card admin-list-card" aria-live="polite">
            <div className="card-head">
              <h2>รายการ{currentTab.label}</h2>
              <span className="muted-sm">
                {q
                  ? `${visibleCount} จาก ${counts[activeTab]} รายการ`
                  : `${counts[activeTab]} รายการ`}
              </span>
            </div>
            {counts[activeTab] > 0 && (
              <input
                className="input admin-filter"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`ค้นหา${currentTab.label}…`}
                aria-label={`ค้นหา${currentTab.label}`}
              />
            )}
            <ul className="admin-reference-list">
              {activeTab === "species" &&
                visible.species.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.commonName}
                      <small className="sci">{item.scientificName}</small>
                      {item.aliases.length > 0 && (
                        <small>
                          ชื่ออื่น:{" "}
                          {item.aliases.map((alias) => alias.name).join(", ")}
                        </small>
                      )}
                    </span>
                    {(item.genus || item.family) && (
                      <small className="admin-chip">
                        {[item.genus, item.family].filter(Boolean).join(" · ")}
                      </small>
                    )}
                  </li>
                ))}
              {activeTab === "locations" &&
                visible.locations.map((item) => {
                  const itemHasCoords =
                    item.latitude != null && item.longitude != null;
                  return (
                    <li key={item.id}>
                      <span>
                        {item.name}
                        <small>{item.province || "ไม่ระบุจังหวัด"}</small>
                        {itemHasCoords && (
                          <small className="coords">
                            {item.latitude!.toFixed(5)},{" "}
                            {item.longitude!.toFixed(5)}
                          </small>
                        )}
                      </span>
                      {itemHasCoords ? (
                        <a
                          className="admin-chip admin-chip-link"
                          href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          ดูแผนที่ ↗
                        </a>
                      ) : (
                        <small className="admin-chip admin-chip-muted">
                          ไม่มีพิกัด
                        </small>
                      )}
                    </li>
                  );
                })}
              {activeTab === "methods" &&
                visible.methods.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                  </li>
                ))}
              {counts[activeTab] === 0 && (
                <li className="admin-list-empty">ยังไม่มีรายการ</li>
              )}
              {counts[activeTab] > 0 && visibleCount === 0 && (
                <li className="admin-list-empty">
                  ไม่พบรายการที่ตรงกับ “{filter}”
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
