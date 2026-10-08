"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResubmitRecordButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resubmit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/ants/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ส่งตรวจอีกครั้งไม่สำเร็จ");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="my-record-resubmit">
      <button type="button" className="btn btn-outline" onClick={resubmit} disabled={busy}>
        {busy ? "กำลังส่ง…" : "ส่งตรวจอีกครั้ง"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
