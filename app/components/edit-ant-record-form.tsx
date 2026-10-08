"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AntImageUpload, { type UploadedAntImage } from "./ant-image-upload";
import "./ant-form.css";
import "./edit-ant-record-form.css";

type EditRecord = {
  id: string;
  speciesId: number | null;
  amount: number;
  locationId: number | null;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  collectionMethodId: number | null;
  collectionMethodOther: string;
  collectedAt: string;
  description: string;
  status: "DRAFT" | "REJECTED";
  images: UploadedAntImage[];
};

function initialDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export default function EditAntRecordForm({
  record,
  options,
  userId,
}: {
  record: EditRecord;
  options: { species: { id: number; commonName: string; scientificName: string }[]; locations: { id: number; name: string; province: string | null }[]; methods: { id: number; name: string }[] };
  userId: string;
}) {
  const router = useRouter();
  const initial = initialDateTime(record.collectedAt);
  const [speciesId, setSpeciesId] = useState(record.speciesId ? String(record.speciesId) : "");
  const [locationId, setLocationId] = useState(record.locationId ? String(record.locationId) : "");
  const [locationText, setLocationText] = useState(record.locationText);
  const [latitude, setLatitude] = useState(record.latitude === null ? "" : String(record.latitude));
  const [longitude, setLongitude] = useState(record.longitude === null ? "" : String(record.longitude));
  const [methodId, setMethodId] = useState(record.collectionMethodId ? String(record.collectionMethodId) : "");
  const [methodOther, setMethodOther] = useState(record.collectionMethodOther);
  const [amount, setAmount] = useState(String(record.amount));
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [description, setDescription] = useState(record.description);
  const [images, setImages] = useState<UploadedAntImage[]>(record.images);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState("");

  async function save(mode: "save" | "submit") {
    setError("");
    if (uploading) {
      setError("กรุณารอให้อัปโหลดรูปเสร็จก่อนบันทึก");
      return;
    }
    if ((!locationId && !locationText.trim()) || (!methodId && !methodOther.trim())) {
      setError("กรุณาระบุสถานที่และวิธีเก็บ");
      return;
    }
    setBusy(mode);
    try {
      const response = await fetch(`/api/ants/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesId: speciesId ? Number(speciesId) : null,
          locationId: locationId ? Number(locationId) : null,
          locationText: locationId ? null : locationText.trim(),
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          collectionMethodId: methodId ? Number(methodId) : null,
          collectionMethodOther: methodId ? null : methodOther.trim(),
          amount: Number(amount),
          collectedAt: new Date(`${date}T${time}`).toISOString(),
          description,
          images: images.map((image, sortOrder) => ({ ...image, sortOrder })),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "บันทึกการแก้ไขไม่สำเร็จ");

      if (mode === "submit") {
        const statusResponse = await fetch(`/api/ants/${record.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PENDING" }),
        });
        const statusResult = await statusResponse.json().catch(() => null);
        if (!statusResponse.ok) throw new Error(statusResult?.message ?? "บันทึกแล้ว แต่ส่งตรวจอีกครั้งไม่สำเร็จ");
      }

      router.push(`/my-records?saved=${mode === "submit" ? "submit" : "draft"}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setBusy(null);
    }
  }

  return (
    <div className="container form-page">
      <nav className="breadcrumb" aria-label="เส้นทาง">
        <Link href="/my-records">ข้อมูลของฉัน</Link><span aria-hidden="true">›</span><span aria-current="page">แก้ไขรายการ</span>
      </nav>
      <div className="page-title"><h1>แก้ไขข้อมูลมด</h1><span className="chip chip-draft"><i aria-hidden="true" />{record.status === "DRAFT" ? "ฉบับร่าง" : "ต้องแก้ไข"}</span></div>
      {error && <p className="alert alert-error form-alert" role="alert">{error}</p>}
      <div className="edit-record-layout">
        <section className="card">
          <h2>ข้อมูลการสำรวจ</h2>
          <div className="field"><label htmlFor="edit-species">ชนิดมด <span className="req">*</span></label>
            <select id="edit-species" className="input select" value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
              <option value="">ยังไม่ทราบชนิด</option>
              {options.species.map((item) => <option key={item.id} value={item.id}>{item.commonName} · {item.scientificName}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="edit-amount">จำนวน <span className="req">*</span></label><input id="edit-amount" className="input" type="number" min={1} step={1} required value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="field"><label htmlFor="edit-location">สถานที่ <span className="req">*</span></label>
            <select id="edit-location" className="input select" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">ระบุสถานที่เอง</option>
              {options.locations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.province ? ` · ${item.province}` : ""}</option>)}
            </select>
          </div>
          {!locationId && <div className="field"><label htmlFor="edit-location-text">ชื่อสถานที่ <span className="req">*</span></label><input id="edit-location-text" className="input" value={locationText} maxLength={300} onChange={(event) => setLocationText(event.target.value)} /></div>}
          <div className="edit-record-row">
            <div className="field"><label htmlFor="edit-latitude">ละติจูด</label><input id="edit-latitude" className="input" type="number" min={-90} max={90} step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></div>
            <div className="field"><label htmlFor="edit-longitude">ลองจิจูด</label><input id="edit-longitude" className="input" type="number" min={-180} max={180} step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="edit-method">วิธีเก็บ</label>
            <select id="edit-method" className="input select" value={methodId} onChange={(event) => setMethodId(event.target.value)}>
              <option value="">ระบุวิธีเก็บอื่น</option>
              {options.methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          {!methodId && <div className="field"><label htmlFor="edit-method-other">วิธีเก็บอื่น <span className="req">*</span></label><input id="edit-method-other" className="input" value={methodOther} maxLength={200} onChange={(event) => setMethodOther(event.target.value)} /></div>}
          <div className="edit-record-row">
            <div className="field"><label htmlFor="edit-date">วันที่เก็บ <span className="req">*</span></label><input id="edit-date" className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
            <div className="field"><label htmlFor="edit-time">เวลา <span className="req">*</span></label><input id="edit-time" className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div>
          </div>
          <div className="field"><label htmlFor="edit-description">รายละเอียดเพิ่มเติม</label><textarea id="edit-description" className="input textarea" rows={5} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        </section>
        <section className="card">
          <div className="card-head"><h2>รูปภาพ</h2><span className="muted-sm">{images.length} / 5 รูป</span></div>
          <AntImageUpload images={images} onChange={setImages} onUploadingChange={setUploading} disabled={busy !== null || uploading} maxFiles={5} userId={userId} />
        </section>
        <div className="action-bar edit-record-actions">
          <Link href="/my-records" className="cancel-link">ยกเลิก</Link>
          <div className="action-buttons">
            <button type="button" className="btn btn-outline" onClick={() => void save("save")} disabled={busy !== null || uploading}>{busy === "save" ? "กำลังบันทึก…" : "บันทึกร่าง"}</button>
            <button type="button" className="btn btn-primary" onClick={() => void save("submit")} disabled={busy !== null || uploading}>{busy === "submit" ? "กำลังส่ง…" : "บันทึกและส่งตรวจ"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
