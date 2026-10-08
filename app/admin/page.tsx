import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import AdminReferenceManager from "../components/admin-reference-manager";
import LoadingIndicator from "../components/loading-indicator";

export const metadata: Metadata = { title: "จัดการข้อมูล · Ant Database" };

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดข้อมูลจัดการ..." />}>
      <AdminData />
    </Suspense>
  );
}

async function AdminData() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [species, locations, methods] = await Promise.all([
    prisma.antSpecies.findMany({
      select: { id: true, commonName: true, scientificName: true, genus: true, family: true, aliases: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { commonName: "asc" },
    }),
    prisma.location.findMany({
      select: {
        id: true,
        name: true,
        province: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.collectionMethod.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container" style={{ paddingTop: 24 }}>
          <Link className="btn btn-outline" href="/admin/review">ไปที่คิวตรวจข้อมูล</Link>
        </div>
        <AdminReferenceManager initialData={{ species, locations, methods }} />
      </main>
      <Footer />
    </>
  );
}
