import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AntIcon from "../components/ant-icon";
import Footer from "../components/footer";
import LoadingIndicator from "../components/loading-indicator";
import Navbar from "../components/navbar";
import ObservationCard from "../components/observation-card";
import Pagination from "../components/pagination";
import "./records.css";

export const metadata: Metadata = { title: "ฐานข้อมูลชนิดมด · Ant Database" };

const PAGE_SIZE = 12;

export default function RecordsPage(props: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    unclassified?: string | string[];
  }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังโหลดฐานข้อมูลมด..." />}>
      <RecordsContent {...props} />
    </Suspense>
  );
}

async function RecordsContent({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    unclassified?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const q = first(params.q)?.trim() ?? "";
  const isUnclassified = first(params.unclassified) === "1";
  const parsedPage = Number(first(params.page) ?? "1");
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const recordWhere = {
    status: "APPROVED" as const,
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" as const } },
            { species: { commonName: { contains: q, mode: "insensitive" as const } } },
            { species: { scientificName: { contains: q, mode: "insensitive" as const } } },
            { species: { aliases: { some: { name: { contains: q, mode: "insensitive" as const } } } } },
            { location: { name: { contains: q, mode: "insensitive" as const } } },
            { location: { province: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const pageHref = (nextPage: number, unclassified = isUnclassified) => {
    const query = new URLSearchParams({ ...(q ? { q } : {}), page: String(nextPage) });
    if (unclassified) query.set("unclassified", "1");
    return `/records?${query}`;
  };

  if (isUnclassified) {
    const where = { ...recordWhere, speciesId: null };
    const total = await prisma.antRecord.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const records = await prisma.antRecord.findMany({
      where,
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

    return (
      <PageFrame>
        <div className="section-head">
          <div>
            <Link className="records-back-link" href={pageHref(1, false)}>← ชนิดมดทั้งหมด</Link>
            <h1>รายการที่ยังไม่จำแนกชนิด</h1>
            <p>{total.toLocaleString("th-TH")} รายการ</p>
          </div>
        </div>
        <SearchForm q={q} unclassified />
        {records.length ? (
          <div className="record-grid">
            {records.map((record) => <ObservationCard key={record.id} record={record} />)}
          </div>
        ) : <EmptyState query={q} />}
        <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} hrefForPage={(next) => pageHref(next)} label="เปลี่ยนหน้ารายการที่ยังไม่จำแนก" />
      </PageFrame>
    );
  }

  const speciesWhere = { records: { some: recordWhere } };
  const [totalSpecies, unclassifiedCount] = await Promise.all([
    prisma.antSpecies.count({ where: speciesWhere }),
    prisma.antRecord.count({ where: { ...recordWhere, speciesId: null } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalSpecies / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const species = await prisma.antSpecies.findMany({
    where: speciesWhere,
    include: {
      aliases: { orderBy: { name: "asc" } },
      records: {
        where: recordWhere,
        include: {
          location: { select: { name: true, province: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
        orderBy: { collectedAt: "desc" },
        take: 1,
      },
      _count: { select: { records: { where: recordWhere } } },
    },
    orderBy: { commonName: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <PageFrame>
      <div className="section-head">
        <div>
          <h1>ฐานข้อมูลชนิดมด</h1>
          <p>{totalSpecies.toLocaleString("th-TH")} ชนิด · รวมชื่อเรียกอื่นและบันทึกที่ผ่านการตรวจแล้ว</p>
        </div>
      </div>
      <SearchForm q={q} />

      {species.length ? (
        <div className="record-grid">
          {species.map((item) => {
            const sample = item.records[0];
            return (
              <Link key={item.id} href={`/species/${item.id}`} className="record-card species-card">
                <div className="record-thumb">
                  {sample?.images[0] ? (
                    <Image src={sample.images[0].url} alt={`รูป${item.commonName}`} fill sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized />
                  ) : <AntIcon size={52} />}
                </div>
                <span className="badge-count">{item._count.records.toLocaleString("th-TH")} บันทึก</span>
                <div className="record-body">
                  <h2 className="record-title">{item.commonName}</h2>
                  <p className="sci">{item.scientificName}</p>
                  {item.aliases.length > 0 && (
                    <p className="record-place">ชื่อเรียกอื่น: {item.aliases.map((alias) => alias.name).join(", ")}</p>
                  )}
                  {sample && (
                    <p className="record-meta">
                      พบล่าสุดที่ {[sample.location?.name, sample.location?.province].filter(Boolean).join(", ") || "ไม่ระบุสถานที่"}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : <EmptyState query={q} />}

      {unclassifiedCount > 0 && (
        <section className="unclassified-summary">
          <div>
            <h2>รายการที่ยังไม่จำแนกชนิด</h2>
            <p>{unclassifiedCount.toLocaleString("th-TH")} บันทึก · แสดงแยกไว้เพื่อไม่รวมมดต่างชนิดเข้าด้วยกัน</p>
          </div>
          <Link className="btn btn-outline" href={pageHref(1, true)}>ดูรายการ</Link>
        </section>
      )}
      <Pagination page={page} totalPages={totalPages} totalItems={totalSpecies} pageSize={PAGE_SIZE} hrefForPage={(next) => pageHref(next, false)} label="เปลี่ยนหน้าชนิดมด" />
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="page-main">
        <section className="container section">{children}</section>
      </main>
      <Footer />
    </>
  );
}

function SearchForm({ q, unclassified = false }: { q: string; unclassified?: boolean }) {
  return (
    <form className="search-box records-search" action="/records" method="get" role="search">
      <input name="q" type="search" defaultValue={q} placeholder="ค้นหาชื่อมด สถานที่ หรือรายละเอียด" aria-label="ค้นหาฐานข้อมูลมด" />
      {unclassified && <input type="hidden" name="unclassified" value="1" />}
      <button className="btn btn-primary" type="submit">ค้นหา</button>
    </form>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="records-empty">
      <AntIcon size={52} />
      <h2>{query ? "ไม่พบข้อมูลที่ตรงกับคำค้น" : "ยังไม่มีชนิดมดที่เผยแพร่"}</h2>
      <p>{query ? "ลองค้นด้วยชื่อวิทยาศาสตร์หรือชื่อสถานที่" : "ชนิดมดจะแสดงเมื่อมีบันทึกที่ผ่านการตรวจสอบ"}</p>
    </div>
  );
}
