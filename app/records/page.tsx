import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import AntIcon from "../components/ant-icon";
import Footer from "../components/footer";
import LoadingIndicator from "../components/loading-indicator";
import Navbar from "../components/navbar";
import ObservationCard from "../components/observation-card";
import Pagination from "../components/pagination";
import "./records.css";

export const metadata: Metadata = {
  title: "ฐานข้อมูลชนิดมด · Ant Database",
};

const PAGE_SIZE = 12;

type SearchParams = {
  q?: string | string[];
  page?: string | string[];
  view?: string | string[];
  province?: string | string[];
  method?: string | string[];
  from?: string | string[];
  to?: string | string[];
  unclassified?: string | string[];
};

type SearchView = "species" | "records";

export default function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator label="กำลังค้นหาฐานข้อมูลมด..." />}>
      <RecordsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RecordsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const q = (first(params.q)?.trim() ?? "").slice(0, 120);
  const view: SearchView = first(params.view) === "records" ? "records" : "species";
  const isUnclassified =
    view === "records" && first(params.unclassified) === "1";
  const province = (first(params.province) ?? "").slice(0, 100);
  const rawMethod = first(params.method) ?? "";
  const parsedMethod = Number(rawMethod);
  const methodId =
    Number.isSafeInteger(parsedMethod) && parsedMethod > 0
      ? parsedMethod
      : undefined;
  const rawFrom = first(params.from) ?? "";
  const rawTo = first(params.to) ?? "";
  const fromDate = parseBangkokDate(rawFrom);
  const toDateExclusive = parseBangkokDate(rawTo, true);
  const invalidDateRange = Boolean(
    fromDate && toDateExclusive && fromDate >= toDateExclusive,
  );
  const parsedPage = Number(first(params.page) ?? "1");
  const requestedPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const searchTerms = q.split(/\s+/).filter(Boolean);
  const conditions: Prisma.AntRecordWhereInput[] = searchTerms.map((term) => ({
    OR: [
      { description: { contains: term, mode: "insensitive" } },
      {
        species: {
          is: { commonName: { contains: term, mode: "insensitive" } },
        },
      },
      {
        species: {
          is: { scientificName: { contains: term, mode: "insensitive" } },
        },
      },
      {
        species: {
          is: {
            aliases: {
              some: { name: { contains: term, mode: "insensitive" } },
            },
          },
        },
      },
      {
        location: {
          is: { name: { contains: term, mode: "insensitive" } },
        },
      },
      {
        location: {
          is: { province: { contains: term, mode: "insensitive" } },
        },
      },
      {
        collectionMethod: {
          is: { name: { contains: term, mode: "insensitive" } },
        },
      },
    ],
  }));

  if (province) {
    conditions.push({ location: { is: { province: { equals: province } } } });
  }
  if (methodId) conditions.push({ collectionMethodId: methodId });
  if (invalidDateRange) {
    conditions.push({ id: { in: [] } });
  } else if (fromDate || toDateExclusive) {
    conditions.push({
      collectedAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDateExclusive ? { lt: toDateExclusive } : {}),
      },
    });
  }

  const recordWhere: Prisma.AntRecordWhereInput = {
    status: "APPROVED",
    ...(conditions.length ? { AND: conditions } : {}),
  };

  const [provinceRows, methods] = await Promise.all([
    prisma.location.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ["province"],
      orderBy: { province: "asc" },
    }),
    prisma.collectionMethod.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const provinces = provinceRows
    .map((row) => row.province)
    .filter((value): value is string => Boolean(value));

  const currentSearch = new URLSearchParams();
  if (q) currentSearch.set("q", q);
  if (province) currentSearch.set("province", province);
  if (methodId) currentSearch.set("method", String(methodId));
  if (fromDate) currentSearch.set("from", rawFrom);
  if (toDateExclusive) currentSearch.set("to", rawTo);

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams(currentSearch);
    query.set("view", view);
    query.set("page", String(nextPage));
    if (isUnclassified) query.set("unclassified", "1");
    return `/records?${query.toString()}`;
  };
  const viewHref = (nextView: SearchView) => {
    const query = new URLSearchParams(currentSearch);
    query.set("view", nextView);
    return `/records?${query.toString()}`;
  };

  if (view === "records") {
    const where: Prisma.AntRecordWhereInput = {
      ...recordWhere,
      ...(isUnclassified ? { speciesId: null } : {}),
    };
    const total = await prisma.antRecord.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const records = await prisma.antRecord.findMany({
      where,
      select: {
        id: true,
        amount: true,
        collectedAt: true,
        species: { select: { commonName: true, scientificName: true } },
        location: { select: { name: true, province: true } },
        collectionMethod: { select: { name: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: [{ collectedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    return (
      <PageFrame>
        <SearchHeader
          view={view}
          q={q}
          province={province}
          methodId={methodId}
          from={fromDate ? rawFrom : ""}
          to={toDateExclusive ? rawTo : ""}
          methods={methods}
          provinces={provinces}
          invalidDateRange={invalidDateRange}
          unclassified={isUnclassified}
          viewHref={viewHref}
        />
        <p className="search-result-summary" aria-live="polite">
          {total.toLocaleString("th-TH")} บันทึกการพบ
          {q ? <> สำหรับ “{q}”</> : null}
        </p>
        {records.length ? (
          <div className="record-grid">
            {records.map((record) => (
              <ObservationCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState
            query={q}
            hasFilters={Boolean(province || methodId || fromDate || toDateExclusive)}
          />
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          hrefForPage={pageHref}
          label="เปลี่ยนหน้าบันทึกการพบ"
        />
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
    select: {
      id: true,
      commonName: true,
      scientificName: true,
      aliases: { orderBy: { name: "asc" }, select: { name: true } },
      records: {
        where: recordWhere,
        select: {
          location: { select: { name: true, province: true } },
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
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
      <SearchHeader
        view={view}
        q={q}
        province={province}
        methodId={methodId}
        from={fromDate ? rawFrom : ""}
        to={toDateExclusive ? rawTo : ""}
        methods={methods}
        provinces={provinces}
        invalidDateRange={invalidDateRange}
        viewHref={viewHref}
      />
      <p className="search-result-summary" aria-live="polite">
        {totalSpecies.toLocaleString("th-TH")} ชนิดมด
        {q ? <> สำหรับ “{q}”</> : null}
      </p>
      {species.length ? (
        <div className="record-grid">
          {species.map((item) => {
            const sample = item.records[0];
            return (
              <Link
                key={item.id}
                href={`/species/${item.id}`}
                className="record-card species-card"
              >
                <div className="record-thumb">
                  {sample?.images[0] ? (
                    <Image
                      src={sample.images[0].url}
                      alt={`รูป${item.commonName}`}
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <AntIcon size={52} />
                  )}
                </div>
                <span className="badge-count">
                  {item._count.records.toLocaleString("th-TH")} บันทึก
                </span>
                <div className="record-body">
                  <h2 className="record-title">{item.commonName}</h2>
                  <p className="sci">{item.scientificName}</p>
                  {item.aliases.length > 0 && (
                    <p className="record-place">
                      ชื่อเรียกอื่น: {item.aliases.map((alias) => alias.name).join(", ")}
                    </p>
                  )}
                  {sample && (
                    <p className="record-meta">
                      พบล่าสุดที่ {[sample.location?.name, sample.location?.province]
                        .filter(Boolean)
                        .join(", ") || "ไม่ระบุสถานที่"}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          query={q}
          hasFilters={Boolean(province || methodId || fromDate || toDateExclusive)}
        />
      )}

      {unclassifiedCount > 0 && (
        <section className="unclassified-summary">
          <div>
            <h2>รายการที่ยังไม่จำแนกชนิด</h2>
            <p>
              {unclassifiedCount.toLocaleString("th-TH")} บันทึก
              {q ? ` ที่ตรงกับ “${q}”` : " ที่ยังไม่ผูกกับชนิดมด"}
            </p>
          </div>
          <Link
            className="btn btn-outline"
            href={viewHref("records") + "&unclassified=1"}
          >
            ดูบันทึกที่ยังไม่จำแนก
          </Link>
        </section>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalSpecies}
        pageSize={PAGE_SIZE}
        hrefForPage={pageHref}
        label="เปลี่ยนหน้าชนิดมด"
      />
    </PageFrame>
  );
}

function SearchHeader({
  view,
  q,
  province,
  methodId,
  from,
  to,
  methods,
  provinces,
  invalidDateRange,
  unclassified = false,
  viewHref,
}: {
  view: SearchView;
  q: string;
  province: string;
  methodId?: number;
  from: string;
  to: string;
  methods: { id: number; name: string }[];
  provinces: string[];
  invalidDateRange: boolean;
  unclassified?: boolean;
  viewHref: (view: SearchView) => string;
}) {
  return (
    <>
      <div className="records-heading">
        <div>
          <p className="records-eyebrow">ANT DATABASE · FIELD OBSERVATIONS</p>
          <h1>{unclassified ? "บันทึกที่ยังไม่จำแนกชนิด" : "สำรวจฐานข้อมูลมด"}</h1>
          <p>ค้นด้วยชื่อมด ชื่อวิทยาศาสตร์ สถานที่ หรือรายละเอียดการเก็บ</p>
        </div>
      </div>

      <nav className="search-view-tabs" aria-label="ประเภทผลการค้นหา">
        <a
          href={viewHref("species")}
          className={view === "species" ? "is-active" : undefined}
          aria-current={view === "species" ? "page" : undefined}
        >
          ชนิดมด
        </a>
        <a
          href={viewHref("records")}
          className={view === "records" ? "is-active" : undefined}
          aria-current={view === "records" ? "page" : undefined}
        >
          บันทึกการพบ
        </a>
      </nav>

      <form className="records-search-form" action="/records" method="get" role="search">
        <input type="hidden" name="view" value={view} />
        {unclassified && <input type="hidden" name="unclassified" value="1" />}
        <div className="records-search-main">
          <label className="records-query-field">
            <span className="sr-only">คำค้น</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={120}
              placeholder="เช่น มดแดง, Oecophylla, เชียงใหม่..."
              aria-label="ค้นหาชื่อมด สถานที่ หรือรายละเอียด"
            />
          </label>
          <button className="btn btn-primary" type="submit">ค้นหา</button>
          {(q || province || methodId || from || to || unclassified) && (
            <Link
              className="records-clear-link"
              href={view === "records" ? "/records?view=records" : "/records"}
            >
              ล้างตัวกรอง
            </Link>
          )}
        </div>

        <div className="records-filter-grid">
          <label>
            <span>จังหวัด</span>
            <select name="province" defaultValue={province}>
              <option value="">ทุกจังหวัด</option>
              {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>วิธีเก็บตัวอย่าง</span>
            <select name="method" defaultValue={methodId ? String(methodId) : ""}>
              <option value="">ทุกวิธี</option>
              {methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>ตั้งแต่วันที่</span>
            <input type="date" name="from" defaultValue={from} />
          </label>
          <label>
            <span>ถึงวันที่</span>
            <input type="date" name="to" defaultValue={to} />
          </label>
        </div>
        {invalidDateRange && (
          <p className="records-filter-error" role="alert">
            วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด
          </p>
        )}
      </form>
    </>
  );
}

function parseBangkokDate(value: string, endExclusive = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00+07:00`);
  if (endExclusive) date.setUTCDate(date.getUTCDate() + 1);
  return date;
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

function EmptyState({
  query,
  hasFilters = false,
}: {
  query: string;
  hasFilters?: boolean;
}) {
  const hasSearch = Boolean(query || hasFilters);
  return (
    <div className="records-empty">
      <AntIcon size={52} />
      <h2>{hasSearch ? "ไม่พบผลลัพธ์ที่ตรงกับการค้นหา" : "ยังไม่มีข้อมูลที่เผยแพร่"}</h2>
      <p>
        {hasSearch
          ? "ลองใช้ชื่อวิทยาศาสตร์ ชื่อเรียกอื่น หรือเอาตัวกรองบางรายการออก"
          : "รายการที่ผ่านการตรวจสอบจะแสดงที่นี่"}
      </p>
    </div>
  );
}
