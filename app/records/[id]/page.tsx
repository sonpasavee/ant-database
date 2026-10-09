import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AntIcon from "../../components/ant-icon";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import RecordGallery from "./record-gallery";
import RecordMap from "./record-map";
import LoadingIndicator from "../../components/loading-indicator";
import "./record-detail.css";

export const metadata: Metadata = {
  title: "รายละเอียดข้อมูลมด · Ant Database",
};

/* ---------- ตัวช่วยจัดรูปแบบ (ล็อกเขตเวลาไทย กันเวลาเพี้ยนบน server แบบ UTC) ---------- */
const TZ = "Asia/Bangkok";
const dateFmt = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("");
  return Array.from(parts[0])[0] + Array.from(parts[1])[0];
}

function DetailLoading() {
  return <LoadingIndicator />;
}

export default function RecordDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailLoading />}>
      <RecordDetailContent {...props} />
    </Suspense>
  );
}

async function RecordDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = await prisma.antRecord.findFirst({
    where: { id, status: "APPROVED" },
    include: {
      species: true,
      location: true,
      collectionMethod: true,
      collectedBy: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!record) notFound();

  // เจ้าของข้อมูล? (ต้องให้ session.user.id ตรงกับ id ของ User ใน Prisma)
  const session = await auth();
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const isOwner =
    Boolean(sessionUserId) && sessionUserId === record.collectedBy.id;

  const speciesName = record.species?.commonName ?? "ยังไม่จำแนกชนิด";
  const locationName = record.location?.name ?? "ไม่ระบุสถานที่";
  const province = record.location?.province ?? null;
  const methodName = record.collectionMethod?.name ?? "ไม่ระบุวิธีเก็บ";
  const locationCoords =
    record.location?.latitude != null && record.location?.longitude != null
      ? {
          lat: Number(record.location.latitude),
          lng: Number(record.location.longitude),
        }
      : null;
  const isValidCoords = (coords: { lat: number; lng: number } | null) =>
    coords !== null &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180;
  const coords = isValidCoords(locationCoords) ? locationCoords : null;
  const collector = record.collectedBy.name ?? "ไม่ระบุชื่อ";

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "ชนิดมด", value: speciesName },
    ...(record.species
      ? [
          {
            label: "ชื่อวิทยาศาสตร์",
            value: <em className="rd-sci">{record.species.scientificName}</em>,
          },
        ]
      : []),
    {
      label: "จำนวนที่เก็บได้",
      value: `${record.amount.toLocaleString("th-TH")} ตัว`,
    },
    {
      label: "วันที่เก็บ",
      value: `${dateFmt.format(record.collectedAt)} · ${timeFmt.format(record.collectedAt)} น.`,
    },
    { label: "วิธีการเก็บ", value: methodName },
    {
      label: "สถานที่",
      value: (
        <>
          {locationName}
          {province && <span className="rd-sub">จ.{province}</span>}
        </>
      ),
    },
    {
      label: "ผู้เก็บข้อมูล",
      value: (
        <span className="rd-collector">
          <span className="rd-avatar" aria-hidden="true">
            {initials(collector)}
          </span>
          {collector}
        </span>
      ),
    },
  ];

  return (
    <>
      <Navbar />

      {isOwner && (
        <div className="rd-owner">
          <div className="container rd-owner-inner">
            <div className="rd-owner-info">
              <span>มุมมองเจ้าของข้อมูล</span>
              <span className="rd-chip rd-chip-ok">
                <i aria-hidden="true" />
                อนุมัติแล้ว
              </span>
              <span className="rd-owner-note">
                การแก้ไขจะส่งกลับไปรอตรวจสอบอีกครั้ง
              </span>
            </div>
            <div className="rd-owner-actions">
              <Link
                href={`/records/${record.id}/edit`}
                className="btn btn-outline"
              >
                แก้ไข
              </Link>
              <button type="button" className="rd-btn-ghost" disabled>
                ลบ (ให้ผู้ดูแลลบ)
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="page-main">
        <article className="container rd-page">
          <nav className="rd-crumbs" aria-label="เส้นทาง">
            <Link href="/">หน้าแรก</Link>
            <span aria-hidden="true">›</span>
            <Link href="/records">รายการข้อมูลมด</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{speciesName}</span>
          </nav>

          <header className="rd-heading">
            <div>
              <h1>{speciesName}</h1>
              {record.species && (
                <p className="rd-sci-lg">{record.species.scientificName}</p>
              )}
            </div>
            <span className="rd-count">
              {record.amount.toLocaleString("th-TH")} ตัว
            </span>
          </header>

          <div className="rd-layout">
            {/* ---------- ซ้าย: รูป + รายละเอียด ---------- */}
            <div className="rd-main">
              <section className="rd-card rd-card-flush" aria-label="รูปภาพ">
                {record.images.length > 0 ? (
                  <RecordGallery
                    alt={speciesName}
                    images={record.images.map((img) => ({
                      id: img.id,
                      url: img.url,
                      caption: img.caption ?? null,
                    }))}
                  />
                ) : (
                  <div className="rd-nophoto">
                    <AntIcon size={72} />
                    <span>ไม่มีรูปภาพแนบ</span>
                  </div>
                )}
              </section>

              {record.description && (
                <section className="rd-card">
                  <h2>รายละเอียดเพิ่มเติม</h2>
                  <p className="rd-desc">{record.description}</p>
                </section>
              )}
            </div>

            {/* ---------- ขวา: ข้อมูลการเก็บ + แผนที่ ---------- */}
            <aside className="rd-side">
              <section className="rd-card" aria-labelledby="rd-info-title">
                <h2 id="rd-info-title">ข้อมูลการเก็บ</h2>
                <dl className="rd-rows">
                  {rows.map((r) => (
                    <div className="rd-row" key={r.label}>
                      <dt>{r.label}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rd-card" aria-labelledby="rd-map-title">
                <h2 id="rd-map-title">ตำแหน่งที่เก็บ</h2>
                {coords ? (
                  <>
                    <RecordMap
                      lat={coords.lat}
                      lng={coords.lng}
                      label={locationName}
                    />
                    <div className="rd-map-foot">
                      <span className="rd-coords">
                        {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </span>
                      <a
                        className="rd-link"
                        href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        เปิด Google Maps ↗
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="rd-empty">ผู้บันทึกไม่ได้ระบุพิกัดของจุดเก็บ</p>
                )}
              </section>
            </aside>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
