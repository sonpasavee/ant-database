"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, createLocation, type Option } from "@/lib/ants-api";

export default function AddLocationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (option: Option) => void;
}) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // โฟกัสช่องแรก + ปิดด้วย Esc
  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setBusy(true);
    try {
      const option = await createLocation({
        name: name.trim(),
        province: province.trim(),
      });
      setName("");
      setProvince("");
      onCreated(option);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setError("มีสถานที่นี้อยู่ในระบบแล้ว ลองเลือกจากรายการแทน");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("บัญชีนี้ไม่มีสิทธิ์เพิ่มสถานที่ กรุณาติดต่อผู้ดูแล");
      } else {
        setError("เพิ่มสถานที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-location-title"
      >
        <h2 id="add-location-title">เพิ่มสถานที่ใหม่</h2>
        <p className="field-hint">สถานที่ที่เพิ่มจะถูกเลือกให้อัตโนมัติ</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="loc-name">
              ชื่อสถานที่ <span className="req">*</span>
            </label>
            <input
              id="loc-name"
              ref={nameRef}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น อุทยานแห่งชาติเขาใหญ่"
              minLength={2}
              maxLength={150}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="loc-province">
              จังหวัด <span className="req">*</span>
            </label>
            <input
              id="loc-province"
              className="input"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="เช่น นครราชสีมา"
              maxLength={100}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "เพิ่มสถานที่"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
