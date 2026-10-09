import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
  label?: string;
};

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  hrefForPage,
  label = "เปลี่ยนหน้ารายการ",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const visiblePages = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...visiblePages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  return (
    <nav className="pagination" aria-label={label}>
      <p className="pagination-summary">
        แสดง <strong>{firstItem.toLocaleString("th-TH")}-{lastItem.toLocaleString("th-TH")}</strong> จาก <strong>{totalItems.toLocaleString("th-TH")}</strong> รายการ
      </p>
      <div className="pagination-controls">
        {page > 1 ? (
          <Link className="pagination-step" href={hrefForPage(page - 1)} aria-label="หน้าก่อน">ก่อนหน้า</Link>
        ) : <span className="pagination-step is-disabled" aria-disabled="true">ก่อนหน้า</span>}
        <div className="pagination-pages">
          {pages.map((item, index) => (
            <span className="pagination-slot" key={item}>
              {index > 0 && item - pages[index - 1] > 1 && <span className="pagination-ellipsis" aria-hidden="true">…</span>}
              {item === page ? (
                <span className="pagination-page is-current" aria-current="page">{item}</span>
              ) : (
                <Link className="pagination-page" href={hrefForPage(item)} aria-label={`หน้า ${item}`}>{item}</Link>
              )}
            </span>
          ))}
        </div>
        {page < totalPages ? (
          <Link className="pagination-step" href={hrefForPage(page + 1)} aria-label="หน้าถัดไป">ถัดไป</Link>
        ) : <span className="pagination-step is-disabled" aria-disabled="true">ถัดไป</span>}
      </div>
    </nav>
  );
}
