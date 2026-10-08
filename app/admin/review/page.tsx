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

export const metadata: Metadata = { title: "ตรวจสอบข้อมูล · Ant Database" };

export default function AdminReviewPage() {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดคิวตรวจข้อมูล..." />}>
      <AdminReviewData />
    </Suspense>
  );
}

async function AdminReviewData() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [records, species] = await Promise.all([prisma.antRecord.findMany({
    where: { status: "PENDING" },
    include: {
      species: true,
      location: true,
      collectionMethod: true,
      collectedBy: { select: { name: true, email: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  }), prisma.antSpecies.findMany({ select: { id: true, commonName: true, scientificName: true }, orderBy: { commonName: "asc" } })]);

  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section admin-review-page">
          <header className="admin-review-heading">
            <div>
              <p className="admin-eyebrow">พื้นที่ผู้ดูแลระบบ</p>
              <h1>คิวตรวจสอบข้อมูล</h1>
              <p>ตรวจรายละเอียดและรูปภาพก่อนเผยแพร่ข้อมูล</p>
            </div>
            <Link className="btn btn-outline" href="/admin">ภาพรวมผู้ดูแล</Link>
          </header>
          <AdminReviewQueue initialRecords={records} speciesOptions={species} />
        </section>
      </main>
      <Footer />
    </>
  );
}
