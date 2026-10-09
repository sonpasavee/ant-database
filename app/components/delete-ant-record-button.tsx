"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./record-actions.css";

export default function DeleteAntRecordButton({
  id,
  returnTo,
  label = "ลบข้อมูล",
}: {
  id: string;
  returnTo: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wasConfirmingRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!confirming) {
      if (wasConfirmingRef.current) {
        wasConfirmingRef.current = false;
        triggerRef.current?.focus();
      }
      return;
    }
    if (!dialog) return;

    wasConfirmingRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [confirming]);

  useEffect(() => {
    if (!confirming && !busy) triggerRef.current?.focus();
  }, [confirming, busy]);

  function closeDialog() {
    if (busy) return;
    setError("");
    setConfirming(false);
  }

  async function deleteRecord() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/ants/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message ?? "ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      }

      dialogRef.current?.close();
      setConfirming(false);
      setBusy(false);
      if (pathname === returnTo) {
        router.refresh();
      } else {
        router.push(returnTo);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      setBusy(false);
    }
  }

  return (
    <div className="record-delete-control">
      {!confirming && (
        <button
          ref={triggerRef}
          className="btn btn-danger-outline"
          type="button"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          disabled={busy}
          aria-label={`${label} ${id}`}
        >
          {label}
        </button>
      )}
      {confirming && (
        <dialog
          ref={dialogRef}
          className="record-delete-dialog"
          aria-labelledby={`delete-record-title-${id}`}
          aria-describedby={`delete-record-description-${id}`}
          onCancel={(event) => {
            event.preventDefault();
            closeDialog();
          }}
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            ) closeDialog();
          }}
        >
          <div className="record-delete-dialog-content">
            <div className="record-delete-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id={`delete-record-title-${id}`}>ยืนยันการลบข้อมูล</h2>
            <p id={`delete-record-description-${id}`}>
              ข้อมูลรายการนี้และรูปภาพที่เกี่ยวข้องจะถูกลบถาวร และไม่สามารถกู้คืนได้
            </p>
            {error && <p className="record-delete-error" role="alert">{error}</p>}
            <div className="record-delete-dialog-actions">
              <button
                ref={cancelRef}
                className="btn btn-outline"
                type="button"
                onClick={closeDialog}
                disabled={busy}
              >
                ยกเลิก
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void deleteRecord()}
                disabled={busy}
              >
                {busy ? "กำลังลบ…" : "ลบถาวร"}
              </button>
            </div>
            {busy && <p className="record-delete-progress" role="status">กำลังลบข้อมูล โปรดรอสักครู่…</p>}
          </div>
        </dialog>
      )}
    </div>
  );
}
