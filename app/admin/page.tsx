import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import LoadingIndicator from "../components/loading-indicator";
import "./admin.css";

export const metadata: Metadata = { title: "ภาพรวมผู้ดูแล · Ant Database" };

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลด Dashboard..." />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [totalRecords, pending, approved, rejected, drafts, users, species, locations, methods, latest] = await Promise.all([
    prisma.antRecord.count(),
    prisma.antRecord.count({ where: { status: "PENDING" } }),
    prisma.antRecord.count({ where: { status: "APPROVED" } }),
    prisma.antRecord.count({ where: { status: "REJECTED" } }),
    prisma.antRecord.count({ where: { status: "DRAFT" } }),
    prisma.user.count(),
    prisma.antSpecies.count(),
    prisma.location.count(),
    prisma.collectionMethod.count(),
    prisma.antRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        createdAt: true,
        amount: true,
        species: { select: { commonName: true, scientificName: true } },
        location: { select: { name: true, province: true } },
        locationText: true,
        collectedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const cards = [
    { label: "รอตรวจสอบ", value: pending, className: "pending", href: "/admin/review" },
    { label: "เผยแพร่แล้ว", value: approved, className: "approved", href: "/records" },
    { label: "ฉบับร่าง", value: drafts, className: "draft" },
    { label: "ส่งกลับแก้ไข", value: rejected, className: "rejected" },
  ];

  return (
    <>
      <Navbar />
      <main className="page-main admin-dashboard-page">
        <div className="container section">
          <header className="admin-dashboard-heading">
            <div>
              <p className="admin-eyebrow">พื้นที่ผู้ดูแลระบบ</p>
              <h1>ภาพรวมระบบ</h1>
              <p>ติดตามข้อมูลสำรวจและจัดการรายการที่รอตรวจสอบ</p>
            </div>
            <Link className="btn btn-primary" href="/admin/review">เปิดคิวตรวจสอบ</Link>
          </header>

          <section className="admin-stat-grid" aria-label="สรุปรายการข้อมูล">
            <article className="admin-stat-card total">
              <span>รายการสำรวจทั้งหมด</span>
              <strong>{totalRecords.toLocaleString("th-TH")}</strong>
            </article>
            {cards.map((card) => card.href ? (
              <Link className={`admin-stat-card ${card.className}`} href={card.href} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value.toLocaleString("th-TH")}</strong>
              </Link>
            ) : (
              <article className={`admin-stat-card ${card.className}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value.toLocaleString("th-TH")}</strong>
              </article>
            ))}
          </section>

          <section className="admin-dashboard-columns">
            <div className="card admin-latest-card">
              <div className="admin-section-heading">
                <div><h2>รายการล่าสุด</h2><p>ข้อมูลที่เพิ่งถูกบันทึกเข้าระบบ</p></div>
                <Link href="/records" className="text-btn">ดูรายการทั้งหมด</Link>
              </div>
              {latest.length ? (
                <div className="admin-latest-list">
                  {latest.map((record) => {
                    const href = record.status === "APPROVED"
                      ? `/records/${record.id}`
                      : record.status === "PENDING" ? "/admin/review" : undefined;
                    const row = (
                      <>
                        <span className={`admin-status-dot ${record.status.toLowerCase()}`} aria-hidden="true" />
                        <span className="admin-latest-primary">
                          <strong>{record.species?.commonName ?? "รอจำแนกชนิดมด"}</strong>
                          {record.species && <em>{record.species.scientificName}</em>}
                          <small>{[record.collectedBy.name ?? record.collectedBy.email, record.location?.name ?? record.locationText, record.location?.province].filter(Boolean).join(" · ") || "ไม่ระบุสถานที่"}</small>
                        </span>
                        <span className="admin-latest-meta">
                          <strong>{record.amount.toLocaleString("th-TH")} ตัว</strong>
                          <small>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(record.createdAt)}</small>
                        </span>
                      </>
                    );
                    return href ? (
                      <Link href={href} className="admin-latest-row" key={record.id}>{row}</Link>
                    ) : (
                      <div className="admin-latest-row" key={record.id}>{row}</div>
                    );
                  })}
                </div>
              ) : <p className="admin-dashboard-empty">ยังไม่มีข้อมูลสำรวจ</p>}
            </div>

            <aside className="card admin-overview-card">
              <h2>ข้อมูลระบบ</h2>
              <p>ข้อมูลอ้างอิงที่ถูกใช้ในรายการสำรวจ ซึ่งจะเพิ่มเมื่อมีการใช้งานจริง</p>
              <dl>
                <div><dt>บัญชีผู้ใช้</dt><dd>{users.toLocaleString("th-TH")}</dd></div>
                <div><dt>ชนิดมดที่ถูกเลือก</dt><dd>{species.toLocaleString("th-TH")}</dd></div>
                <div><dt>สถานที่</dt><dd>{locations.toLocaleString("th-TH")}</dd></div>
                <div><dt>วิธีเก็บ</dt><dd>{methods.toLocaleString("th-TH")}</dd></div>
              </dl>
              <Link href="/admin/review" className="btn btn-outline">ตรวจรายการที่รอดำเนินการ</Link>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
