import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import AdminReviewQueue from "../../components/admin-review-queue";
import LoadingIndicator from "../../components/loading-indicator";
import Pagination from "../../components/pagination";

export const metadata: Metadata = { title: "ตรวจสอบข้อมูล · Ant Database" };

const PAGE_SIZE = 10;

export default function AdminReviewPage(props: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดคิวตรวจข้อมูล..." />}>
      <AdminReviewData searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AdminReviewData({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue ?? "1");
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await prisma.antRecord.count({ where: { status: "PENDING" } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(safePage, totalPages);
  const records = await prisma.antRecord.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      amount: true,
      collectedAt: true,
      description: true,
      species: true,
      location: {
        select: {
          name: true,
          province: true,
          latitude: true,
          longitude: true,
        },
      },
      collectionMethod: true,
      collectedBy: { select: { name: true, email: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section admin-review-page">
          <header className="admin-review-heading">
            <div>
              <p className="admin-eyebrow">พื้นที่ผู้ดูแลระบบ</p>
              <h1>คิวตรวจสอบข้อมูล</h1>
              <p>ตรวจรายละเอียดและรูปภาพก่อนเผยแพร่ข้อมูล · {total.toLocaleString("th-TH")} รายการรอตรวจ</p>
            </div>
            <div className="admin-review-heading-actions">
              <Link className="btn btn-outline" href="/admin/records">จัดการข้อมูลทั้งหมด</Link>
              <Link className="btn btn-outline" href="/admin">ภาพรวมผู้ดูแล</Link>
            </div>
          </header>
          <AdminReviewQueue key={`${page}-${total}`} initialRecords={records} />
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            hrefForPage={(nextPage) => `/admin/review?page=${nextPage}`}
            label="เปลี่ยนหน้าคิวตรวจสอบ"
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
