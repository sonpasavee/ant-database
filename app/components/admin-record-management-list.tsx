"use client";

import Link from "next/link";
import DeleteAntRecordButton from "./delete-ant-record-button";

type ManagedRecord = {
  id: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  amount: number;
  collectedAt: Date;
  species: { commonName: string; scientificName: string } | null;
  location: { name: string; province: string | null } | null;
  collectedBy: { name: string | null; email: string | null };
};

const statusLabels: Record<ManagedRecord["status"], string> = {
  DRAFT: "ฉบับร่าง",
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ต้องแก้ไข",
};

export default function AdminRecordManagementList({
  records,
}: {
  records: ManagedRecord[];
}) {
  if (records.length === 0) {
    return <div className="admin-records-empty"><h2>ไม่พบรายการ</h2><p>ลองเลือกสถานะอื่น หรือกลับมาดูภายหลัง</p></div>;
  }

  return (
    <div className="admin-records-list">
      {records.map((record) => (
        <article className="admin-record-row" key={record.id}>
          <div className="admin-record-info">
            <div className="admin-record-title">
              <strong>{record.species?.commonName ?? "ยังไม่จำแนกชนิด"}</strong>
              <span className={`admin-record-status-badge status-${record.status.toLowerCase()}`}>{statusLabels[record.status]}</span>
            </div>
            {record.species && <em>{record.species.scientificName}</em>}
            <span>{[record.location?.name, record.location?.province].filter(Boolean).join(", ") || "ไม่ระบุสถานที่"}</span>
            <span>
              {record.amount.toLocaleString("th-TH")} ตัว · {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "medium",
                timeZone: "Asia/Bangkok",
              }).format(record.collectedAt)} · {record.collectedBy.name ?? record.collectedBy.email ?? "ไม่ระบุผู้บันทึก"}
            </span>
          </div>
          <div className="admin-record-actions">
            <Link
              className="btn btn-outline"
              href={`/my-records/${encodeURIComponent(record.id)}/edit?returnTo=admin`}
            >
              แก้ไข
            </Link>
            <DeleteAntRecordButton
              id={record.id}
              returnTo="/admin/records"
              label="ลบ"
            />
          </div>
        </article>
      ))}
    </div>
  );
}
