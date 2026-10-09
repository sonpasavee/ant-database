import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Footer from "../../components/footer";
import LoadingIndicator from "../../components/loading-indicator";
import Navbar from "../../components/navbar";
import ObservationCard from "../../components/observation-card";
import Pagination from "../../components/pagination";
import SpeciesMap from "./species-map";
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
  const [species, total, mapLocations] = await Promise.all([
    prisma.antSpecies.findUnique({
      where: { id },
      include: { aliases: { orderBy: { name: "asc" } } },
    }),
    prisma.antRecord.count({ where: { speciesId: id, status: "APPROVED" } }),
    prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        records: { some: { speciesId: id, status: "APPROVED" } },
      },
      select: {
        id: true,
        name: true,
        province: true,
        latitude: true,
        longitude: true,
        _count: {
          select: {
            records: { where: { speciesId: id, status: "APPROVED" } },
          },
        },
        records: {
          where: { speciesId: id, status: "APPROVED" },
          select: {
            id: true,
            amount: true,
            collectedAt: true,
            collectionMethod: { select: { name: true } },
          },
          orderBy: { collectedAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ province: "asc" }, { name: "asc" }],
    }),
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
  const speciesMapLocations = mapLocations.flatMap((location) => {
    if (
      location.latitude === null ||
      location.longitude === null ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      location.latitude < -90 ||
      location.latitude > 90 ||
      location.longitude < -180 ||
      location.longitude > 180
    ) return [];
    return [{
      id: location.id,
      name: location.name,
      province: location.province,
      latitude: location.latitude,
      longitude: location.longitude,
      recordCount: location._count.records,
      records: location.records.map((record) => ({
        id: record.id,
        amount: record.amount,
        collectedAt: record.collectedAt.toISOString(),
        collectionMethod: record.collectionMethod?.name ?? null,
      })),
    }];
  });
  const mappedRecords = speciesMapLocations.reduce((sum, location) => sum + location.recordCount, 0);

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
            {species.subfamily && <div><span>วงศ์ย่อย</span><strong>{species.subfamily}</strong></div>}
            {species.aliases.length > 0 && (
              <div className="species-aliases"><span>ชื่อเรียกอื่น</span><strong>{species.aliases.map((alias) => alias.name).join(", ")}</strong></div>
            )}
            {species.description && <p className="species-description">{species.description}</p>}
          </div>

          <div className="species-records-heading">
            <div>
              <h2>บันทึกการพบมด</h2>
              <p>ดูจุดที่พบมดชนิดนี้บนแผนที่ และรายละเอียดการสำรวจแต่ละรายการ</p>
            </div>
          </div>

          <section className="species-map-section" aria-labelledby="species-map-title">
            <header className="species-map-heading">
              <div>
                <h2 id="species-map-title">แผนที่จุดที่พบ</h2>
                <p>แสดงตำแหน่งจากพิกัดของสถานที่ที่เชื่อมกับบันทึกที่เผยแพร่แล้ว</p>
              </div>
              <div className="species-map-stats" aria-label="สรุปตำแหน่ง">
                <span><strong>{speciesMapLocations.length.toLocaleString("th-TH")}</strong> สถานที่บนแผนที่</span>
                <span><strong>{mappedRecords.toLocaleString("th-TH")}</strong> บันทึกมีพิกัด</span>
                {total > mappedRecords && (
                  <span><strong>{(total - mappedRecords).toLocaleString("th-TH")}</strong> บันทึกยังไม่มีพิกัด</span>
                )}
              </div>
            </header>
            <SpeciesMap locations={speciesMapLocations} />
          </section>

          {records.length ? (
            <div className="record-grid">
              {records.map((record) => <ObservationCard key={record.id} record={record} />)}
            </div>
          ) : (
            <div className="records-empty"><h2>ยังไม่มีบันทึกที่เผยแพร่</h2></div>
          )}

          <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} hrefForPage={pageHref} label="เปลี่ยนหน้าบันทึกของชนิดมด" />
        </section>
      </main>
      <Footer />
    </>
  );
}
