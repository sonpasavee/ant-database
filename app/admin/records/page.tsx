import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RecordStatus } from "@/app/generated/prisma/enums";
import AdminRecordManagementList from "../../components/admin-record-management-list";
import Footer from "../../components/footer";
import LoadingIndicator from "../../components/loading-indicator";
import Navbar from "../../components/navbar";
import Pagination from "../../components/pagination";
import "./admin-records.css";

export const metadata: Metadata = { title: "จัดการข้อมูลสำรวจ · Ant Database" };

const PAGE_SIZE = 20;
const statuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const satisfies readonly RecordStatus[];
type StatusFilter = (typeof statuses)[number];

function parseStatus(value: string | string[] | undefined): StatusFilter | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return statuses.find((status) => status === candidate);
}

export default function AdminRecordsPage(props: {
  searchParams: Promise<{ page?: string | string[]; status?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดรายการทั้งหมด..." />}>
      <AdminRecordsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AdminRecordsContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; status?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const status = parseStatus(params.status);
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue ?? "1");
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = status ? { status } : {};
  const total = await prisma.antRecord.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(safePage, totalPages);
  const records = await prisma.antRecord.findMany({
    where,
    select: {
      id: true,
      status: true,
      amount: true,
      collectedAt: true,
      species: { select: { commonName: true, scientificName: true } },
      location: { select: { name: true, province: true } },
      collectedBy: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (status) query.set("status", status);
    return `/admin/records?${query}`;
  };

  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section admin-records-page">
          <header className="admin-records-heading">
            <div>
              <p className="admin-eyebrow">พื้นที่ผู้ดูแลระบบ</p>
              <h1>จัดการข้อมูลสำรวจ</h1>
              <p>ผู้ดูแลสามารถแก้ไขหรือลบข้อมูลได้ทุกสถานะ โดยไม่จำกัดผู้บันทึก · {total.toLocaleString("th-TH")} รายการ</p>
            </div>
            <Link className="btn btn-outline" href="/admin">กลับภาพรวม</Link>
          </header>

          <nav className="admin-record-status-filters" aria-label="กรองตามสถานะ">
            <Link className={!status ? "is-active" : ""} href="/admin/records">ทั้งหมด</Link>
            {statuses.map((item) => (
              <Link
                className={status === item ? "is-active" : ""}
                href={`/admin/records?status=${item}`}
                key={item}
              >
                {{ DRAFT: "ฉบับร่าง", PENDING: "รอตรวจ", APPROVED: "อนุมัติแล้ว", REJECTED: "ต้องแก้ไข" }[item]}
              </Link>
            ))}
          </nav>

          <AdminRecordManagementList records={records} />
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            hrefForPage={hrefFor}
            label="เปลี่ยนหน้ารายการทั้งหมด"
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
