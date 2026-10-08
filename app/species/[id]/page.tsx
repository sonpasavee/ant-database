import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Footer from "../../components/footer";
import LoadingIndicator from "../../components/loading-indicator";
import Navbar from "../../components/navbar";
import ObservationCard from "../../components/observation-card";
import "./species-detail.css";

export const metadata: Metadata = { title: "รายละเอียดชนิดมด · Ant Database" };
const PAGE_SIZE = 12;

export default function SpeciesDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดข้อมูลชนิดมด..." />}>
      <SpeciesDetailContent {...props} />
    </Suspense>
  );
}

async function SpeciesDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ id: idParam }, query] = await Promise.all([params, searchParams]);
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const pageValue = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsedPage = Number(pageValue ?? "1");
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [species, total] = await Promise.all([
    prisma.antSpecies.findUnique({
      where: { id },
      include: { aliases: { orderBy: { name: "asc" } } },
    }),
    prisma.antRecord.count({ where: { speciesId: id, status: "APPROVED" } }),
  ]);
  if (!species) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const records = await prisma.antRecord.findMany({
    where: { speciesId: id, status: "APPROVED" },
    include: {
      species: { select: { commonName: true, scientificName: true } },
      location: { select: { name: true, province: true } },
      collectionMethod: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
    orderBy: { collectedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const pageHref = (nextPage: number) => `/species/${id}?page=${nextPage}`;

  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section species-detail">
          <Link className="species-back" href="/records">← กลับไปฐานข้อมูลชนิดมด</Link>
          <header className="species-heading">
            <div>
              <p className="species-eyebrow">ข้อมูลชนิดมด</p>
              <h1>{species.commonName}</h1>
              <p className="species-scientific">{species.scientificName}</p>
            </div>
            <span className="species-record-count">{total.toLocaleString("th-TH")} บันทึก</span>
          </header>

          <div className="species-facts">
            {species.genus && <div><span>สกุล</span><strong>{species.genus}</strong></div>}
            {species.family && <div><span>วงศ์</span><strong>{species.family}</strong></div>}
            {species.aliases.length > 0 && (
              <div className="species-aliases"><span>ชื่อเรียกอื่น</span><strong>{species.aliases.map((alias) => alias.name).join(", ")}</strong></div>
            )}
            {species.description && <p className="species-description">{species.description}</p>}
          </div>

          <div className="species-records-heading">
            <div>
              <h2>บันทึกการพบมด</h2>
              <p>แต่ละรายการเก็บแยกตามสถานที่ วันเวลา พิกัด และผู้บันทึก</p>
            </div>
          </div>

          {records.length ? (
            <div className="record-grid">
              {records.map((record) => <ObservationCard key={record.id} record={record} />)}
            </div>
          ) : (
            <div className="records-empty"><h2>ยังไม่มีบันทึกที่เผยแพร่</h2></div>
          )}

          {totalPages > 1 && (
            <nav className="records-pagination" aria-label="เปลี่ยนหน้าบันทึก">
              {page > 1 ? <Link className="btn btn-outline" href={pageHref(page - 1)}>หน้าก่อน</Link> : <span />}
              <span>หน้า {page} / {totalPages}</span>
              {page < totalPages ? <Link className="btn btn-outline" href={pageHref(page + 1)}>หน้าถัดไป</Link> : <span />}
            </nav>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
