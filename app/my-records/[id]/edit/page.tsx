import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Footer from "../../../components/footer";
import Navbar from "../../../components/navbar";
import EditAntRecordForm from "../../../components/edit-ant-record-form";
import LoadingIndicator from "../../../components/loading-indicator";

export const metadata: Metadata = { title: "แก้ไขข้อมูลมด · Ant Database" };

export default function EditMyRecordPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <Suspense fallback={<LoadingIndicator label="กำลังโหลดข้อมูลมด..." />}><EditMyRecordContent {...props} /></Suspense>;
}

async function EditMyRecordContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const record = await prisma.antRecord.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (
    !record ||
    record.collectedById !== session.user.id ||
    (record.status !== "DRAFT" && record.status !== "REJECTED")
  ) notFound();

  const [species, locations, methods] = await Promise.all([
    prisma.antSpecies.findMany({ select: { id: true, commonName: true, scientificName: true }, orderBy: { commonName: "asc" } }),
    prisma.location.findMany({ select: { id: true, name: true, province: true }, orderBy: { name: "asc" } }),
    prisma.collectionMethod.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar />
      <main className="page-main">
        <EditAntRecordForm
          record={{
            id: record.id,
            speciesId: record.speciesId,
            amount: record.amount,
            locationId: record.locationId,
            locationText: record.locationText ?? "",
            latitude: record.latitude,
            longitude: record.longitude,
            collectionMethodId: record.collectionMethodId,
            collectionMethodOther: record.collectionMethodOther ?? "",
            collectedAt: record.collectedAt.toISOString(),
            description: record.description ?? "",
            status: record.status,
            images: record.images.map(({ url, publicId }) => ({ url, publicId })),
          }}
          options={{ species, locations, methods }}
          userId={session.user.id}
        />
      </main>
      <Footer />
    </>
  );
}
