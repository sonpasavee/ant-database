import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AntIcon from "../components/ant-icon";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import ResubmitRecordButton from "../components/resubmit-record-button";
import LoadingIndicator from "../components/loading-indicator";
import "./my-records.css";

export const metadata: Metadata = { title: "ข้อมูลของฉัน · Ant Database" };

const PAGE_SIZE = 12;

const statusLabels = {
  DRAFT: "ฉบับร่าง",
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ต้องแก้ไข",
} as const;

export default function MyRecordsPage(props: {
  searchParams: Promise<{ saved?: string | string[]; page?: string | string[] }>;
}) {
  return <Suspense fallback={<LoadingIndicator label="กำลังโหลดข้อมูลของคุณ..." />}><MyRecordsContent {...props} /></Suspense>;
}

async function MyRecordsContent({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string | string[]; page?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageParam ?? "1");
  const safeRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const total = await prisma.antRecord.count({
    where: { collectedById: session.user.id },
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(safeRequestedPage, totalPages);

  const records = await prisma.antRecord.findMany({
    where: { collectedById: session.user.id },
    include: {
      species: true,
      location: true,
      collectionMethod: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const savedParam = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const savedMessage =
    savedParam === "draft"
      ? "บันทึกฉบับร่างเรียบร้อยแล้ว"
      : savedParam === "submit"
        ? "บันทึกข้อมูลเรียบร้อยแล้ว"
        : null;

  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section my-records-page">
          <div className="my-records-heading">
            <div>
              <p className="my-records-eyebrow">Ant Database</p>
              <h1>ข้อมูลของฉัน</h1>
              <p className="my-records-description">
                รายการข้อมูลมดที่คุณบันทึกไว้ทั้งหมด {total.toLocaleString("th-TH")} รายการ
              </p>
            </div>
            <Link href="/records/new" className="btn btn-primary">
              + เพิ่มข้อมูลมด
            </Link>
          </div>

          {savedMessage && (
            <p className="my-records-success" role="status">
              {savedMessage}
            </p>
          )}

          {records.length > 0 ? (
            <>
              <div className="my-records-grid">
                {records.map((record) => (
                  <article className="my-record-card" key={record.id}>
                    <div className="my-record-image">
                      {record.images[0] ? (
                        <Image
                          src={record.images[0].url}
                          alt={`รูป${record.species?.commonName ?? "มด"}`}
                          fill
                          sizes="(max-width: 720px) 100vw, 360px"
                          unoptimized
                        />
                      ) : (
                        <AntIcon size={48} />
                      )}
                      <span className={`my-record-status status-${record.status.toLowerCase()}`}>
                        {statusLabels[record.status]}
                      </span>
                    </div>
                    <div className="my-record-content">
                      <h2>{record.species?.commonName ?? "ยังไม่จำแนกชนิด"}</h2>
                      {record.species && <p className="sci">{record.species.scientificName}</p>}
                      <dl>
                        <div>
                          <dt>จำนวน</dt>
                          <dd>{record.amount.toLocaleString("th-TH")} ตัว</dd>
                        </div>
                        <div>
                          <dt>สถานที่</dt>
                          <dd>
                            {[record.location?.name ?? record.locationText, record.location?.province]
                              .filter(Boolean)
                              .join(", ")}
                          </dd>
                        </div>
                        <div>
                          <dt>วันที่เก็บ</dt>
                          <dd>
                            {new Intl.DateTimeFormat("th-TH", {
                              dateStyle: "medium",
                            }).format(record.collectedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt>วิธีเก็บ</dt>
                          <dd>{record.collectionMethod?.name ?? record.collectionMethodOther ?? "ไม่ระบุ"}</dd>
                        </div>
                      </dl>
                      {record.status === "REJECTED" && record.rejectionReason && (
                        <p className="my-record-rejection">
                          เหตุผลที่ต้องแก้ไข: {record.rejectionReason}
                        </p>
                      )}
                      {(record.status === "DRAFT" || record.status === "REJECTED") && (
                        <div className="my-record-actions">
                          <Link href={`/my-records/${record.id}/edit`} className="btn btn-outline">
                            แก้ไขข้อมูล
                          </Link>
                          {record.status === "DRAFT" && <ResubmitRecordButton id={record.id} />}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="my-records-pagination" aria-label="เปลี่ยนหน้ารายการ">
                  {page > 1 ? (
                    <Link href={`/my-records?page=${page - 1}`} className="btn btn-outline">
                      หน้าก่อน
                    </Link>
                  ) : <span />}
                  <span>หน้า {page} / {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={`/my-records?page=${page + 1}`} className="btn btn-outline">
                      หน้าถัดไป
                    </Link>
                  ) : <span />}
                </nav>
              )}
            </>
          ) : (
            <div className="my-records-empty">
              <AntIcon size={56} />
              <h2>ยังไม่มีข้อมูลที่บันทึกไว้</h2>
              <p>เริ่มบันทึกข้อมูลมดจากการสำรวจของคุณได้เลย</p>
              <Link href="/records/new" className="btn btn-primary">
                เพิ่มข้อมูลมดรายการแรก
              </Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
