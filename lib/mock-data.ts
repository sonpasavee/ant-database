// ข้อมูลจำลอง — เมื่อเขียน API เสร็จให้เปลี่ยนไปเรียก service/fetch แทนไฟล์นี้
// โดยคง type เดิมไว้ หน้า home จะไม่ต้องแก้มาก

export type RecordSummary = {
  id: number;
  count: number;
  commonName: string;
  scientificName: string;
  location: string;
  collectedAt: string;
  method: string;
  author: string;
};

export type HomeStats = {
  records: number;
  species: number;
  locations: number;
};

export const mockStats: HomeStats = {
  records: 1284,
  species: 86,
  locations: 42,
};

export const mockRecentRecords: RecordSummary[] = [
  {
    id: 101,
    count: 48,
    commonName: "มดแดง",
    scientificName: "Oecophylla smaragdina",
    location: "ป่าชุมชนบ้านห้วยทราย จ.เชียงใหม่",
    collectedAt: "14 มี.ค. 2569",
    method: "เก็บด้วยมือ",
    author: "สมชาย ใจดี",
  },
  {
    id: 100,
    count: 126,
    commonName: "มดคันไฟ",
    scientificName: "Solenopsis geminata",
    location: "อุทยานแห่งชาติเขาใหญ่ จ.นครราชสีมา",
    collectedAt: "2 มี.ค. 2569",
    method: "กับดักหลุม",
    author: "นภัสสร พรหมา",
  },
  {
    id: 99,
    count: 9,
    commonName: "มดตะนอย",
    scientificName: "Tetraponera rufonigra",
    location: "อุทยานแห่งชาติภูกระดึง จ.เลย",
    collectedAt: "21 ก.พ. 2569",
    method: "เก็บด้วยมือ",
    author: "ธนกร ศรีสุข",
  },
  {
    id: 98,
    count: 31,
    commonName: "มดช่างไม้",
    scientificName: "Camponotus sp.",
    location: "ป่าชายเลนบางปู จ.สมุทรปราการ",
    collectedAt: "9 ก.พ. 2569",
    method: "ล่อด้วยเหยื่อ",
    author: "สมชาย ใจดี",
  },
  {
    id: 97,
    count: 74,
    commonName: "มดหัวโต",
    scientificName: "Pheidole sp.",
    location: "เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง จ.อุทัยธานี",
    collectedAt: "30 ม.ค. 2569",
    method: "Winkler extraction",
    author: "นภัสสร พรหมา",
  },
  {
    id: 96,
    count: 22,
    commonName: "มดแดง",
    scientificName: "Oecophylla smaragdina",
    location: "อุทยานแห่งชาติเขาใหญ่ จ.นครราชสีมา",
    collectedAt: "18 ม.ค. 2569",
    method: "กวาดใบไม้",
    author: "ธนกร ศรีสุข",
  },
];
