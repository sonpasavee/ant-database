/**
 * ชั้นเรียก API ฝั่ง client สำหรับหน้าเพิ่มข้อมูลมด
 *
 * ⚠️ ผมไม่เห็น response/body จริงของ API คุณ จึงรวมทุกอย่างที่ "เดา" ไว้ไฟล์นี้ไฟล์เดียว
 *    ถ้าชื่อ field ไม่ตรง ให้แก้เฉพาะ:
 *      1) ฟังก์ชัน toOption ด้านล่าง (ชื่อ field ที่ใช้แสดงผลใน dropdown)
 *      2) CreateAntInput + createAnt (ชื่อ field ที่ส่งไป POST /api/ants)
 *      3) CreateLocationInput + createLocation
 */

type Raw = Record<string, unknown>;

/* ---------- Error ---------- */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
  ) {
    super(message ?? "เกิดข้อผิดพลาด");
  }
}

/* ---------- request helper ---------- */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof json?.error === "string" ? json.error : json?.error?.code,
      json?.message ?? json?.error?.message,
    );
  }
  // รองรับทั้ง { data: ... } และ response ที่เป็นข้อมูลตรง ๆ
  return (
    json && typeof json === "object" && "data" in json ? json.data : json
  ) as T;
}

/** แปลง response ของ list ให้เป็น array เสมอ (รองรับ [], {items}, {results}, {rows}) */
function toArray(x: unknown): Raw[] {
  if (Array.isArray(x)) return x as Raw[];
  if (x && typeof x === "object") {
    for (const key of ["items", "results", "rows", "data"]) {
      const v = (x as Raw)[key];
      if (Array.isArray(v)) return v as Raw[];
    }
  }
  return [];
}

async function listAll(url: string): Promise<Raw[]> {
  const items: Raw[] = [];
  let page = 1;

  while (true) {
    const result = await request<unknown>(`${url}?page=${page}&limit=100`);
    const batch = toArray(result);
    items.push(...batch);

    if (!result || typeof result !== "object" || Array.isArray(result)) break;
    const pagination = (result as Raw).pagination;
    const totalPages =
      pagination && typeof pagination === "object"
        ? Number((pagination as Raw).totalPages)
        : 1;
    if (!batch.length || !Number.isFinite(totalPages) || page >= totalPages) break;
    page += 1;
  }

  return items;
}

function pickStr(raw: Raw, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
}

/* ---------- Option (ใช้กับ <select>) ---------- */
export type Option = {
  /** id ตามที่ API ใช้จริง (number หรือ string) ส่งกลับไปตามเดิมได้เลย */
  id: string | number;
  label: string;
};

export type ListKind = "species" | "location" | "method";

function toOption(kind: ListKind, raw: Raw): Option {
  const id = raw.id as string | number;

  if (kind === "species") {
    const name = pickStr(raw, ["commonName", "nameTh", "thaiName", "name"]);
    const sci = pickStr(raw, ["scientificName", "scientific_name"]);
    const aliases = Array.isArray(raw.aliases)
      ? raw.aliases
          .map((alias) => (alias && typeof alias === "object" ? pickStr(alias as Raw, ["name"]) : undefined))
          .filter((alias): alias is string => Boolean(alias))
      : [];
    return { id, label: [[name, ...aliases].filter(Boolean).join(" / "), sci].filter(Boolean).join(" · ") || `#${id}` };
  }

  if (kind === "location") {
    const name = pickStr(raw, ["name", "nameTh", "title"]) ?? `#${id}`;
    const province = pickStr(raw, ["province", "provinceName"]);
    const text =
      province && !name.includes(province) ? `${name} จ.${province}` : name;
    return { id, label: text };
  }

  // method
  const th = pickStr(raw, ["nameTh", "name", "title"]) ?? `#${id}`;
  const en = pickStr(raw, ["nameEn", "name_en"]);
  return { id, label: en && en !== th ? `${th} (${en})` : th };
}

/* ---------- GET lists ---------- */
export const listSpecies = async () =>
  (await listAll("/api/species")).map((r) =>
    toOption("species", r),
  );

export const listLocations = async () =>
  (await listAll("/api/locations")).map((r) =>
    toOption("location", r),
  );

export const listMethods = async () =>
  (await listAll("/api/collection-methods")).map((r) =>
    toOption("method", r),
  );

/* ---------- POST /api/locations ---------- */
export type CreateLocationInput = {
  name: string;
  province: string;
};

export async function createLocation(
  input: CreateLocationInput,
): Promise<Option> {
  const raw = await request<Raw>("/api/locations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toOption("location", raw);
}

/* ---------- Ant records ---------- */
export const ANT_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type AntStatus = (typeof ANT_STATUS)[keyof typeof ANT_STATUS];

export type CreateAntInput = {
  speciesId: number | null;
  locationId: number | null;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  collectionMethodId: number | null;
  collectionMethodOther?: string;
  amount: number;
  /** ISO 8601 เช่น 2026-03-14T01:30:00.000Z */
  collectedAt: string;
  description?: string;
  images?: {
    url: string;
    publicId: string;
    sortOrder: number;
  }[];
  draft?: boolean;
};

/** สร้างเรคอร์ดใหม่ (เป็นฉบับร่างโดยค่าเริ่มต้น) แล้วคืน id */
export async function createAnt(
  input: CreateAntInput,
): Promise<string | number> {
  const raw = await request<Raw>("/api/ants", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return raw.id as string | number;
}

/** PATCH /api/ants/:id/status */
export async function setAntStatus(id: string | number, status: AntStatus) {
  await request<unknown>(`/api/ants/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
