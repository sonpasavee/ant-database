"use client";

import Image from "next/image";
import { useState } from "react";
import "./admin-review-queue.css";

type ReviewRecord = {
  id: string;
  amount: number;
  collectedAt: Date;
  description: string | null;
  species: { id: number; commonName: string; scientificName: string } | null;
  location: { name: string; province: string | null } | null;
  locationText: string | null;
  collectionMethod: { name: string } | null;
  collectionMethodOther: string | null;
  collectedBy: { name: string | null; email: string | null };
  images: { id: number; url: string; caption: string | null }[];
};

export default function AdminReviewQueue({
  initialRecords,
  speciesOptions,
}: {
  initialRecords: ReviewRecord[];
  speciesOptions: { id: number; commonName: string; scientificName: string }[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<Record<string, string>>({});

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED", rejectionReason?: string, speciesId?: number) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/ants/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason, speciesId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
      setRecords((current) => current.filter((record) => record.id !== id));
      setNotice(status === "APPROVED" ? "อนุมัติและเผยแพร่ข้อมูลแล้ว" : "ส่งข้อมูลกลับพร้อมเหตุผลแล้ว");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-review-list">
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {notice && <p className="alert alert-ok" role="status">{notice}</p>}
      {records.map((record) => (
        <article className="card admin-review-card" key={record.id}>
          <div className="admin-review-main">
            <div className="admin-review-photos">
              {record.images.length ? record.images.map((image) => (
                <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="admin-review-photo">
                  <Image src={image.url} alt={image.caption || `รูป${record.species?.commonName ?? "มด"}`} fill sizes="160px" unoptimized />
                </a>
              )) : <div className="admin-review-no-photo">ไม่มีรูป</div>}
            </div>
            <div className="admin-review-details">
              <div>
                <h2>{record.species?.commonName ?? "รอจำแนกชนิดมด"}</h2>
                {record.species && <p className="sci">{record.species.scientificName}</p>}
              </div>
              <dl>
                <div><dt>จำนวน</dt><dd>{record.amount.toLocaleString("th-TH")} ตัว</dd></div>
                <div><dt>สถานที่</dt><dd>{[record.location?.name ?? record.locationText, record.location?.province].filter(Boolean).join(", ")}</dd></div>
                <div><dt>วันที่เก็บ</dt><dd>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(record.collectedAt)}</dd></div>
                <div><dt>วิธีเก็บ</dt><dd>{record.collectionMethod?.name ?? record.collectionMethodOther}</dd></div>
                <div><dt>ผู้บันทึก</dt><dd>{record.collectedBy.name ?? record.collectedBy.email ?? "ไม่ระบุชื่อ"}</dd></div>
              </dl>
              {record.description && <p className="admin-review-description">{record.description}</p>}
              <label className="admin-review-species">
                <span>{record.species ? "ระบุชนิดมดใหม่ (ถ้าต้องการ)" : "ระบุชนิดมดก่อนอนุมัติ"}</span>
                <select className="input select" value={selectedSpecies[record.id] ?? (record.species ? String(record.species.id) : "")} onChange={(event) => setSelectedSpecies((current) => ({ ...current, [record.id]: event.target.value }))}>
                  <option value="">{record.species ? "ใช้ชนิดมดเดิม" : "เลือกชนิดมด"}</option>
                  {speciesOptions.map((species) => <option key={species.id} value={species.id}>{species.commonName} · {species.scientificName}</option>)}
                </select>
              </label>
            </div>
          </div>
          <form
            className="admin-review-actions"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const reason = String(new FormData(form).get("rejectionReason") ?? "").trim();
              if (!reason) {
                setError("กรุณาระบุเหตุผลก่อนส่งกลับให้แก้ไข");
                return;
              }
              void updateStatus(record.id, "REJECTED", reason);
            }}
          >
            <label className="admin-review-reason">
              <span>เหตุผลกรณีส่งกลับให้แก้ไข</span>
              <input name="rejectionReason" className="input" maxLength={2000} placeholder="ระบุเมื่อกดส่งกลับ" />
            </label>
            <div className="admin-review-buttons">
              <button className="btn btn-outline" type="submit" disabled={busyId === record.id}>ส่งกลับให้แก้ไข</button>
              <button className="btn btn-primary" type="button" disabled={busyId === record.id || (!record.species && !selectedSpecies[record.id])} onClick={() => void updateStatus(record.id, "APPROVED", undefined, selectedSpecies[record.id] ? Number(selectedSpecies[record.id]) : undefined)}>
                {busyId === record.id ? "กำลังบันทึก…" : "อนุมัติและเผยแพร่"}
              </button>
            </div>
          </form>
        </article>
      ))}
      {records.length === 0 && (
        <div className="admin-review-empty">
          <h2>ไม่มีรายการรอตรวจสอบ</h2>
          <p>เมื่อมีผู้ส่งข้อมูลเข้ามา รายการจะปรากฏที่หน้านี้</p>
        </div>
      )}
    </div>
  );
}
