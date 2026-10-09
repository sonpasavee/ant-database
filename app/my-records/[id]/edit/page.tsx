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
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  return <Suspense fallback={<LoadingIndicator label="กำลังโหลดข้อมูลมด..." />}><EditMyRecordContent {...props} /></Suspense>;
}

async function EditMyRecordContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnToValue = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = isAdmin && returnToValue === "admin" ? "/admin/records" : "/my-records";
  const record = await prisma.antRecord.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, location: true, collectionMethod: true },
  });

  if (
    !record ||
    (!isAdmin &&
      (record.collectedById !== session.user.id ||
        (record.status !== "DRAFT" && record.status !== "REJECTED")))
  ) notFound();

  const [species, locations, methods] = await Promise.all([
    record.speciesId ? prisma.antSpecies.findUnique({ where: { id: record.speciesId }, select: { id: true, commonName: true, scientificName: true } }) : Promise.resolve(null),
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
            locationText: record.location?.name ?? "",
            collectionMethodId: record.collectionMethodId,
            collectionMethodOther: record.collectionMethod?.name ?? "",
            collectedAt: record.collectedAt.toISOString(),
            description: record.description ?? "",
            status: record.status,
            images: record.images.map(({ url, publicId }) => ({ url, publicId })),
          }}
          options={{ species, locations, methods }}
          userId={session.user.id}
          isAdmin={isAdmin}
          returnTo={returnTo}
        />
      </main>
      <Footer />
    </>
  );
}
