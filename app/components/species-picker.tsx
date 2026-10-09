"use client";

import { useEffect, useState } from "react";

export type SpeciesOption = { id: number; commonName: string; scientificName: string };

type SpeciesResponse = {
  data?: { items?: SpeciesOption[]; pagination?: { page: number; totalPages: number; total: number } };
  message?: string;
};

export default function SpeciesPicker({
  value,
  initialSpecies = null,
  onChange,
  id,
}: {
  value: string;
  initialSpecies?: SpeciesOption | null;
  onChange: (value: string) => void;
  id: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SpeciesOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedId = Number(value);
  const selected = items.find((item) => item.id === selectedId)
    ?? (initialSpecies?.id === selectedId ? initialSpecies : null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`/api/species?${params}`, { signal: controller.signal });
        const result = await response.json() as SpeciesResponse;
        if (!response.ok) throw new Error(result.message ?? "โหลดรายชื่อชนิดมดไม่สำเร็จ");
        setItems(result.data?.items ?? []);
        setTotal(result.data?.pagination?.total ?? 0);
        setTotalPages(result.data?.pagination?.totalPages ?? 0);
      } catch (fetchError) {
        if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "โหลดรายชื่อชนิดมดไม่สำเร็จ");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, page]);

  return (
    <div className="species-picker">
      {selected && (
        <div className="species-picker-selected">
          <span>{selected.commonName} · <i>{selected.scientificName}</i></span>
          <button type="button" onClick={() => onChange("")} aria-label="ล้างชนิดมดที่เลือก">ล้าง</button>
        </div>
      )}
      <input
        id={id}
        className="input"
        type="search"
        value={query}
        placeholder="ค้นหาชื่อสามัญหรือชื่อวิทยาศาสตร์"
        autoComplete="off"
        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
        aria-describedby={`${id}-hint`}
      />
      <p className="species-picker-hint" id={`${id}-hint`}>
        {loading ? "กำลังค้นหา…" : `${total.toLocaleString("th-TH")} ชนิด · แสดง ${items.length} รายการต่อหน้า`}
      </p>
      {error && <p className="species-picker-error" role="alert">{error}</p>}
      {!loading && items.length > 0 && (
        <ul className="species-picker-results">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={item.id === selectedId ? "is-selected" : ""} onClick={() => onChange(String(item.id))}>
                <span>{item.commonName}</span><i>{item.scientificName}</i>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && items.length === 0 && <p className="species-picker-hint">ไม่พบชนิดมดที่ตรงกับคำค้น</p>}
      {totalPages > 1 && (
        <div className="species-picker-pages">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>ก่อนหน้า</button>
          <span>หน้า {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>ถัดไป</button>
        </div>
      )}
    </div>
  );
}
