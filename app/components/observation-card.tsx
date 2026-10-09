import Image from "next/image";
import Link from "next/link";
import AntIcon from "./ant-icon";

export type ObservationCardRecord = {
  id: string;
  amount: number;
  collectedAt: Date;
  species: { commonName: string; scientificName: string } | null;
  location: { name: string; province: string | null } | null;
  collectionMethod: { name: string } | null;
  images: { url: string }[];
};

export default function ObservationCard({ record }: { record: ObservationCardRecord }) {
  const location = [record.location?.name, record.location?.province]
    .filter(Boolean)
    .join(", ");
  const collectedDate = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(record.collectedAt);

  return (
    <Link href={`/records/${record.id}`} className="record-card">
      <div className="record-thumb">
        {record.images[0] ? (
          <Image
            src={record.images[0].url}
            alt={`รูป${record.species?.commonName ?? "มด"}`}
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <AntIcon size={52} />
        )}
      </div>
      <span className="badge-count">{record.amount.toLocaleString("th-TH")} ตัว</span>
      <div className="record-body">
        <h2 className="record-title">{record.species?.commonName ?? "ยังไม่จำแนกชนิด"}</h2>
        {record.species && <p className="sci">{record.species.scientificName}</p>}
        <p className="record-place">{location || "ไม่ระบุสถานที่"}</p>
        <p className="record-meta">
          เก็บเมื่อ {collectedDate} · {record.collectionMethod?.name ?? "ไม่ระบุวิธีเก็บ"}
        </p>
      </div>
    </Link>
  );
}
