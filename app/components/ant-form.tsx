"use client";

import "./ant-form.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createAnt,
  listLocations,
  listMethods,
  resolveGbifSpecies,
  searchGbifSpecies,
  type GbifSpeciesResult,
  type Option,
} from "@/lib/ants-api";
import AddLocationModal from "./add-location-modal";
import LocationPicker from "./location-picker";
import AntImageUpload, { type UploadedAntImage } from "./ant-image-upload";

/* ---------- ชนิดข้อมูลฟอร์ม ---------- */
type FieldKey =
  | "speciesId"
  | "quantity"
  | "methodId"
  | "date"
  | "time"
  | "locationId"
  | "locationText"
  | "methodOther"
  | "latitude"
  | "longitude"
  | "notes";

type Errors = Partial<Record<FieldKey, string>>;
type SubmitMode = "draft" | "submit";

const FIELD_ORDER: FieldKey[] = [
  "speciesId",
  "quantity",
  "methodId",
  "date",
  "time",
  "locationId",
  "locationText",
  "methodOther",
  "latitude",
  "longitude",
  "notes",
];

const NOTES_MAX = 2000;

/* ---------- hook โหลดรายการสำหรับ dropdown ---------- */
function useOptions(loader: () => Promise<Option[]>) {
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await loader());
    } catch {
      setError("โหลดรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    let active = true;
    loader()
      .then((options) => {
        if (active) setItems(options);
      })
      .catch(() => {
        if (active) setError("โหลดรายการไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return { items, setItems, loading, error, reload: load };
}

/* ---------- ช่อง select พร้อม label / error ---------- */
function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  loading,
  loadError,
  onRetry,
  error,
  hint,
  placeholder,
  required = true,
}: {
  id: FieldKey;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  error?: string;
  hint?: React.ReactNode;
  placeholder: string;
  required?: boolean;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={`field-${id}`}>
        {label} {required && <span className="req">*</span>}
      </label>
      <select
        id={`field-${id}`}
        className="input select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
        <option value="">{loading ? "กำลังโหลด…" : placeholder}</option>
        {options.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </select>
      {loadError && (
        <p className="field-error">
          {loadError}{" "}
          <button type="button" className="text-btn" onClick={onRetry}>
            ลองใหม่
          </button>
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------- helper ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseCoord(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ============================================================
   Component หลัก
   ============================================================ */
export default function AntForm({ userId }: { userId: string }) {
  const router = useRouter();

  const locations = useOptions(listLocations);
  const methods = useOptions(listMethods);

  const [speciesQuery, setSpeciesQuery] = useState("");
  const [speciesResults, setSpeciesResults] = useState<GbifSpeciesResult[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<GbifSpeciesResult | null>(null);
  const [speciesSearching, setSpeciesSearching] = useState(false);
  const [speciesSearchError, setSpeciesSearchError] = useState("");
  const [showSpeciesResults, setShowSpeciesResults] = useState(false);
  const speciesSearchRequest = useRef(0);
  const [quantity, setQuantity] = useState("");
  const [methodId, setMethodId] = useState("");
  const [methodOther, setMethodOther] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [today, setToday] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<UploadedAntImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState<SubmitMode | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLookup, setLocationLookup] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locationLookupRequest = useRef(0);

  useEffect(() => {
    const query = speciesQuery.trim();
    const requestId = ++speciesSearchRequest.current;
    if (query.length < 3 || selectedSpecies) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSpeciesSearching(true);
      try {
        const results = await searchGbifSpecies(query, controller.signal);
        if (requestId === speciesSearchRequest.current) {
          setSpeciesResults(results);
          setShowSpeciesResults(true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (requestId === speciesSearchRequest.current) {
          setSpeciesResults([]);
          setSpeciesSearchError(error instanceof Error ? error.message : "ค้นหาชนิดมดไม่สำเร็จ");
          setShowSpeciesResults(true);
        }
      } finally {
        if (requestId === speciesSearchRequest.current) setSpeciesSearching(false);
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [speciesQuery, selectedSpecies]);

  // ตั้งวันที่/เวลาเริ่มต้นหลัง mount (กัน hydration mismatch)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      setToday(toDateInput(now));
      setDate((d) => d || toDateInput(now));
      setTime((t) => t || toTimeInput(now));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const clearError = (key: FieldKey) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  /* ---------- ตรวจข้อมูล ---------- */
  function validate(): Errors {
    const e: Errors = {};

    if (speciesQuery.trim() && !selectedSpecies) {
      e.speciesId = "เลือกชนิดมดจากผลการค้นหา หรือเว้นว่างไว้เพื่อจำแนกภายหลัง";
    }

    if (quantity.trim() === "") {
      e.quantity = "กรุณากรอกจำนวนที่เก็บได้";
    } else {
      const n = Number(quantity);
      if (!Number.isInteger(n)) e.quantity = "ต้องเป็นจำนวนเต็ม";
      else if (n < 1) e.quantity = "ต้องไม่น้อยกว่า 1";
    }

    if (!methodId && !methodOther.trim()) e.methodId = "เลือกวิธีเก็บ หรือระบุวิธีอื่น";

    if (!date) e.date = "กรุณาเลือกวันที่เก็บ";
    else if (today && date > today) e.date = "วันที่เก็บต้องไม่เป็นวันในอนาคต";

    if (!time) e.time = "กรุณาระบุเวลา";

    if (!locationId && !locationText.trim()) e.locationId = "เลือกสถานที่ หรือระบุสถานที่เอง";

    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    if (latitude.trim() !== "" && lat === null)
      e.latitude = "ละติจูดต้องเป็นตัวเลข";
    else if (lat !== null && (lat < -90 || lat > 90))
      e.latitude = "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90";
    if (longitude.trim() !== "" && lng === null)
      e.longitude = "ลองจิจูดต้องเป็นตัวเลข";
    else if (lng !== null && (lng < -180 || lng > 180))
      e.longitude = "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180";
    // ต้องกรอกคู่กัน
    if (!e.latitude && !e.longitude) {
      if (lat !== null && lng === null)
        e.longitude = "กรุณากรอกลองจิจูดให้ครบคู่";
      if (lat === null && lng !== null)
        e.latitude = "กรุณากรอกละติจูดให้ครบคู่";
    }

    if (notes.length > NOTES_MAX) e.notes = `ไม่เกิน ${NOTES_MAX} ตัวอักษร`;

    return e;
  }

  /* ---------- ส่งข้อมูล ---------- */
  async function submit(mode: SubmitMode) {
    setFormError("");

    if (uploadingImages) {
      setFormError("กรุณารอให้อัปโหลดรูปภาพเสร็จก่อนส่งข้อมูล");
      return;
    }

    const found = validate();
    setErrors(found);
    const firstKey = FIELD_ORDER.find((k) => found[k]);
    if (firstKey) {
      setFormError("กรุณาตรวจสอบข้อมูลที่มีเครื่องหมายผิดพลาด");
      document.getElementById(`field-${firstKey}`)?.focus();
      return;
    }

    // ตรวจ reference ที่ยังเป็นข้อมูลในฐานข้อมูลของแอป
    const find = (list: Option[], v: string) =>
      list.find((o) => String(o.id) === v);
    const loc = find(locations.items, locationId);
    const me = find(methods.items, methodId);
    if ((locationId && !loc) || (methodId && !me)) {
      setFormError("รายการที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่");
      return;
    }

    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    setBusy(mode);
    try {
      const resolvedSpecies = selectedSpecies
        ? await resolveGbifSpecies(selectedSpecies.gbifKey)
        : null;
      await createAnt({
        speciesId: resolvedSpecies?.id ?? null,
        locationId: loc ? Number(loc.id) : null,
        ...(loc ? {} : { locationText: locationText.trim() }),
        ...(lat !== null && lng !== null ? { latitude: lat, longitude: lng } : {}),
        collectionMethodId: me ? Number(me.id) : null,
        ...(me ? {} : { collectionMethodOther: methodOther.trim() }),
        amount: Number(quantity),
        collectedAt: new Date(`${date}T${time}`).toISOString(),
        ...(notes.trim() ? { description: notes.trim() } : {}),
        images: images.map((image, sortOrder) => ({ ...image, sortOrder })),
        draft: mode === "draft",
      });

      router.push(`/my-records?saved=${mode}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFormError(err.message || "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
      } else if (err instanceof ApiError && err.status === 403) {
        setFormError("บัญชีนี้ไม่มีสิทธิ์เพิ่มข้อมูล");
      } else if (err instanceof ApiError) {
        setFormError(err.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } else {
        setFormError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
      setBusy(null);
    }
  }

  /* ---------- ตำแหน่งปัจจุบัน ---------- */
  async function resolveCoordinates(lat: number, lng: number) {
    const requestId = ++locationLookupRequest.current;
    setLocationLookup("กำลังค้นหาจังหวัดจากพิกัด…");
    setLocationId("");

    try {
      const response = await fetch(
        `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      );
      const result = (await response.json()) as {
        label?: string;
        province?: string;
        message?: string;
      };
      if (!response.ok || !result.label || !result.province) {
        throw new Error(result.message ?? "ไม่พบชื่อพื้นที่จากพิกัดนี้");
      }
      if (requestId !== locationLookupRequest.current) return;

      setLocationText(result.label);
      setLocationLookup(`พบจังหวัด${result.province}: ${result.label} — ตรวจสอบหรือแก้ไขได้`);
      clearError("locationText");
      clearError("locationId");
    } catch {
      if (requestId === locationLookupRequest.current) {
        setLocationLookup("ค้นหาชื่อพื้นที่ไม่สำเร็จ แต่ยังบันทึกพิกัดได้");
      }
    }
  }

  function handleCoordinatePick(lat: number, lng: number) {
    setLatitude(String(lat));
    setLongitude(String(lng));
    clearError("latitude");
    clearError("longitude");
    void resolveCoordinates(lat, lng);
  }

  function handlePlaceSelect(lat: number, lng: number, label: string) {
    locationLookupRequest.current += 1;
    setLocationId("");
    setLocationText(label);
    setLocationLookup("เลือกสถานที่แล้ว — ตรวจสอบตำแหน่งหมุดและปรับได้บนแผนที่");
    setLatitude(String(Math.round(lat * 1e6) / 1e6));
    setLongitude(String(Math.round(lng * 1e6) / 1e6));
    clearError("locationText");
    clearError("locationId");
    clearError("latitude");
    clearError("longitude");
  }

  function useCurrentPosition() {
    if (!("geolocation" in navigator)) {
      setErrors((p) => ({
        ...p,
        latitude: "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง",
      }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        handleCoordinatePick(lat, lng);
        setLocating(false);
      },
      () => {
        setErrors((p) => ({
          ...p,
          latitude:
            "ดึงตำแหน่งไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือคลิกบนแผนที่แทน",
        }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const handleLocationCreated = (option: Option) => {
    locations.setItems([...locations.items, option]);
    setLocationId(String(option.id));
    clearError("locationId");
    setShowLocationModal(false);
  };

  const disabled = busy !== null || uploadingImages;

  /* ============================================================ */
  return (
    <>
      <div className="container form-page">
        <nav className="breadcrumb" aria-label="เส้นทาง">
          <Link href="/my-records">ข้อมูลของฉัน</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">เพิ่มข้อมูลใหม่</span>
        </nav>

        <div className="page-title">
          <h1>เพิ่มข้อมูลมด</h1>
          <span className="chip chip-draft">
            <i aria-hidden="true" />
            ฉบับร่าง
          </span>
        </div>

        {formError && (
          <p className="alert alert-error form-alert" role="alert">
            {formError}
          </p>
        )}

        <form
          id="ant-form"
          className="form-layout"
          onSubmit={(e) => {
            e.preventDefault();
            submit("submit");
          }}
          noValidate
        >
          {/* ---------------- คอลัมน์ซ้าย ---------------- */}
          <div className="form-main">
            <section className="card" aria-labelledby="sec-main">
              <h2 id="sec-main">ข้อมูลหลัก</h2>

              <div className="field species-search-field">
                <label htmlFor="field-speciesId">ชนิดมด</label>
                {selectedSpecies ? (
                  <div className="selected-species">
                    <span><strong>{selectedSpecies.canonicalName}</strong><small>{selectedSpecies.authorship || selectedSpecies.scientificName}</small></span>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setSelectedSpecies(null);
                        setSpeciesQuery("");
                        setSpeciesResults([]);
                        setSpeciesSearchError("");
                        setShowSpeciesResults(false);
                      }}
                    >
                      เปลี่ยนชนิดมด
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id="field-speciesId"
                      className="input"
                      value={speciesQuery}
                      onChange={(event) => {
                        setSpeciesQuery(event.target.value);
                        setSelectedSpecies(null);
                        setSpeciesResults([]);
                        setSpeciesSearchError("");
                        setShowSpeciesResults(false);
                        clearError("speciesId");
                      }}
                      maxLength={100}
                      autoComplete="off"
                      placeholder="ค้นหาชื่อมด เช่น Oecophylla smaragdina"
                      aria-controls="species-search-results"
                      aria-invalid={errors.speciesId ? true : undefined}
                    />
                    {speciesQuery.trim().length > 0 && speciesQuery.trim().length < 3 && (
                      <small className="field-hint">พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อค้นหา</small>
                    )}
                    {showSpeciesResults && speciesQuery.trim().length >= 3 && (
                      <div id="species-search-results" className="species-search-results" role="listbox" aria-label="ผลค้นหาชนิดมดจาก GBIF">
                        {speciesSearching && <p className="place-search-message" role="status">กำลังค้นหาชื่อวิทยาศาสตร์จาก GBIF…</p>}
                        {!speciesSearching && speciesSearchError && <p className="place-search-message" role="status">{speciesSearchError}</p>}
                        {!speciesSearching && !speciesSearchError && speciesResults.length === 0 && <p className="place-search-message">ไม่พบชื่อมด ลองค้นด้วยชื่อวิทยาศาสตร์</p>}
                        {!speciesSearching && speciesResults.map((result) => (
                          <button
                            key={result.gbifKey}
                            type="button"
                            role="option"
                            aria-selected="false"
                            className="place-search-option"
                            onClick={() => {
                              setSelectedSpecies(result);
                              setSpeciesQuery(result.canonicalName);
                              setSpeciesResults([]);
                              setShowSpeciesResults(false);
                              clearError("speciesId");
                            }}
                          >
                            <strong>{result.canonicalName}</strong>
                            {result.authorship && <small>{result.authorship}</small>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {errors.speciesId && <p className="field-error">{errors.speciesId}</p>}
                <p className="field-hint">ค้นหาเฉพาะวงศ์มด (Formicidae) จาก <a href="https://www.gbif.org/" target="_blank" rel="noreferrer">GBIF</a> หรือเว้นว่างไว้เพื่อจำแนกชนิดภายหลัง</p>
              </div>

              <div className="row row-3">
                <div className="field">
                  <label htmlFor="field-quantity">
                    จำนวนที่เก็บได้ <span className="req">*</span>
                  </label>
                  <input
                    id="field-quantity"
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      clearError("quantity");
                    }}
                    placeholder="เช่น 48"
                    aria-invalid={errors.quantity ? true : undefined}
                    aria-describedby={
                      errors.quantity ? "quantity-error" : undefined
                    }
                  />
                  {errors.quantity && (
                    <p id="quantity-error" className="field-error">
                      ผิดพลาด · {errors.quantity}
                    </p>
                  )}
                </div>

                <SelectField
                  id="methodId"
                  label="วิธีการเก็บ"
                  value={methodId}
                  onChange={(v) => {
                    setMethodId(v);
                    clearError("methodId");
                  }}
                  options={methods.items}
                  loading={methods.loading}
                  loadError={methods.error}
                  onRetry={methods.reload}
                  error={errors.methodId}
                  placeholder="เลือกวิธีการเก็บ"
                  required={false}
                />
                {!methodId && (
                  <div className="field">
                    <label htmlFor="field-methodOther">วิธีเก็บอื่น <span className="req">*</span></label>
                    <input
                      id="field-methodOther"
                      className="input"
                      value={methodOther}
                      onChange={(event) => {
                        setMethodOther(event.target.value);
                        clearError("methodOther");
                        if (event.target.value.trim()) clearError("methodId");
                      }}
                      maxLength={200}
                      placeholder="ระบุวิธีเก็บที่ใช้"
                    />
                  </div>
                )}

                <div className="field">
                  <label htmlFor="field-date">
                    วันที่เก็บ <span className="req">*</span>
                  </label>
                  <input
                    id="field-date"
                    className="input"
                    type="date"
                    max={today || undefined}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      clearError("date");
                    }}
                    aria-invalid={errors.date ? true : undefined}
                    aria-describedby={errors.date ? "date-error" : undefined}
                  />
                  {errors.date && (
                    <p id="date-error" className="field-error">
                      {errors.date}
                    </p>
                  )}
                </div>
              </div>

              <div className="row row-3">
                <div className="field">
                  <label htmlFor="field-time">
                    เวลา <span className="req">*</span>
                  </label>
                  <input
                    id="field-time"
                    className="input"
                    type="time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      clearError("time");
                    }}
                    aria-invalid={errors.time ? true : undefined}
                    aria-describedby={errors.time ? "time-error" : undefined}
                  />
                  {errors.time && (
                    <p id="time-error" className="field-error">
                      {errors.time}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="card" aria-labelledby="sec-location">
              <h2 id="sec-location">สถานที่และพิกัด</h2>

              <div className="location-row">
                <div className="grow">
                  <SelectField
                    id="locationId"
                    label="สถานที่"
                    value={locationId}
                    onChange={(v) => {
                      locationLookupRequest.current += 1;
                      setLocationLookup("");
                      setLocationId(v);
                      clearError("locationId");
                    }}
                    options={locations.items}
                    loading={locations.loading}
                    loadError={locations.error}
                    onRetry={locations.reload}
                    error={errors.locationId}
                    placeholder="เลือกสถานที่"
                    required={false}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-outline add-location-btn"
                  onClick={() => setShowLocationModal(true)}
                >
                  + เพิ่มสถานที่ใหม่
                </button>
              </div>

              {!locationId && (
                <div className="field">
                  <label htmlFor="field-locationText">ชื่อสถานที่ <span className="req">*</span></label>
                  <input
                    id="field-locationText"
                    className="input"
                    value={locationText}
                    onChange={(event) => {
                      locationLookupRequest.current += 1;
                      setLocationLookup("");
                      setLocationText(event.target.value);
                      clearError("locationText");
                      if (event.target.value.trim()) clearError("locationId");
                    }}
                    maxLength={300}
                    placeholder="ระบุชื่อพื้นที่หรือจุดสำรวจ"
                    aria-invalid={errors.locationText ? true : undefined}
                  />
                  {(errors.locationText || errors.locationId) && (
                    <p className="field-error">{errors.locationText ?? errors.locationId}</p>
                  )}
                </div>
              )}

              <div className="field">
                <span className="field-label">ปักหมุดตำแหน่งที่เก็บ</span>
                <LocationPicker
                  lat={parseCoord(latitude)}
                  lng={parseCoord(longitude)}
                  onPick={handleCoordinatePick}
                  onPlaceSelect={handlePlaceSelect}
                />
                {locationLookup && (
                  <p className="map-location-result" role="status" aria-live="polite">
                    {locationLookup}
                  </p>
                )}
              </div>

              <div className="field"><button
                  type="button"
                  className="btn btn-soft locate-btn"
                  onClick={useCurrentPosition}
                  disabled={locating}
                >
                  {locating ? "กำลังค้นหา…" : "ใช้ตำแหน่งปัจจุบัน"}
                </button></div>
            </section>

            <section className="card" aria-labelledby="sec-notes">
              <h2 id="sec-notes">รายละเอียดเพิ่มเติม</h2>
              <div className="field">
                <label htmlFor="field-notes">
                  บันทึกสภาพแวดล้อมหรือข้อสังเกต
                </label>
                <textarea
                  id="field-notes"
                  className="input textarea"
                  rows={5}
                  maxLength={NOTES_MAX}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    clearError("notes");
                  }}
                  placeholder="เช่น พบรังบนต้นไม้ สภาพอากาศ อุณหภูมิ พฤติกรรมที่สังเกตเห็น"
                  aria-invalid={errors.notes ? true : undefined}
                />
                <p className="char-count" aria-live="polite">
                  {notes.length} / {NOTES_MAX}
                </p>
                {errors.notes && <p className="field-error">{errors.notes}</p>}
              </div>
            </section>
          </div>

          {/* ---------------- คอลัมน์ขวา ---------------- */}
          <aside className="form-side">
            <section className="card" aria-labelledby="sec-photos">
              <div className="card-head">
                <h2 id="sec-photos">รูปภาพ</h2>

                <span className="muted-sm">{images.length} / 5 รูป</span>
              </div>

              <AntImageUpload
                images={images}
                onChange={setImages}
                onUploadingChange={setUploadingImages}
                disabled={disabled}
                maxFiles={5}
                userId={userId}
              />
            </section>

            <section className="card" aria-labelledby="sec-flow">
              <h2 id="sec-flow">ขั้นตอนของข้อมูล</h2>
              <ol className="flow">
                <li className="flow-active">
                  <span className="flow-no">1</span>
                  <div>
                    <strong>ฉบับร่าง</strong>
                    <p>กำลังแก้ไข ยังไม่มีใครเห็น</p>
                  </div>
                </li>
                <li>
                  <span className="flow-no">2</span>
                  <div>
                    <strong>รอตรวจสอบ</strong>
                    <p>ส่งแล้ว แก้ไขไม่ได้จนกว่าผู้ดูแลตรวจเสร็จ</p>
                  </div>
                </li>
                <li>
                  <span className="flow-no">3</span>
                  <div>
                    <strong>อนุมัติแล้ว</strong>
                    <p>เผยแพร่ให้ทุกคนเห็น หากไม่ผ่านจะแจ้งเหตุผลให้แก้ไข</p>
                  </div>
                </li>
              </ol>
            </section>
          </aside>

          {/* ---------------- แถบปุ่ม ---------------- */}
          <div className="action-bar">
            <Link href="/my-records" className="cancel-link">
              ยกเลิก
            </Link>
            <div className="action-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => submit("draft")}
                disabled={disabled}
              >
                {busy === "draft" ? "กำลังบันทึก…" : "บันทึกฉบับร่าง"}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={disabled}
              >
                {busy === "submit" ? "กำลังส่ง…" : "ส่งตรวจสอบ"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* modal อยู่นอก <form> เพื่อไม่ให้ form ซ้อนกัน */}
      <AddLocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onCreated={handleLocationCreated}
      />
    </>
  );
}
