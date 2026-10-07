import Link from "next/link";
import { auth } from "@/auth";
import { mockRecentRecords, mockStats } from "@/lib/mock-data";
import AntIcon from "./components/ant-icon";
import Footer from "./components/footer";
import Navbar from "./components/navbar";

const quickSearches = ["มดแดง", "มดคันไฟ", "Pitfall trap", "อุทยานแห่งชาติ"];

export const instant = false;

const steps = [
  {
    title: "สมัครสมาชิก",
    text: "สร้างบัญชีฟรี ใช้เวลาไม่ถึงหนึ่งนาที",
  },
  {
    title: "บันทึกข้อมูลการเก็บ",
    text: "กรอกชนิดมด จำนวน สถานที่ วิธีเก็บ และอัปโหลดรูปภาพ",
  },
  {
    title: "ส่งให้ผู้ดูแลตรวจสอบ",
    text: "ข้อมูลที่ผ่านการอนุมัติจะแสดงให้ทุกคนเห็น",
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return Array.from(parts[0])[0] + (parts[1] ? Array.from(parts[1])[0] : "");
}

export default async function HomePage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  // TODO: เปลี่ยนเป็นข้อมูลจาก API เมื่อพร้อม
  const stats = mockStats;
  const records = mockRecentRecords;

  return (
    <>
      <Navbar />

      <main className="page-main">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-tag">ฐานข้อมูลตัวอย่างมดจากภาคสนาม</span>
              <h1>
                ค้นหาข้อมูลมด
                <br />
                จากการเก็บตัวอย่างจริง
              </h1>
              <p className="hero-desc">
                ค้นตามชนิด ชื่อวิทยาศาสตร์ สถานที่ หรือวิธีการเก็บ
                ทุกบันทึกผ่านการตรวจสอบโดยผู้ดูแลก่อนเผยแพร่
              </p>

              <form className="search-box" action="/records" method="get" role="search">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  name="q"
                  type="search"
                  placeholder="ชื่อมด, ชื่อวิทยาศาสตร์, สถานที่…"
                  aria-label="ค้นหาข้อมูลมด"
                />
                <button type="submit" className="btn btn-primary">
                  ค้นหา
                </button>
              </form>

              <div className="quick-search">
                <span>ลองค้นหา:</span>
                {quickSearches.map((q) => (
                  <Link
                    key={q}
                    className="quick-chip"
                    href={`/records?q=${encodeURIComponent(q)}`}
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="stats-card" aria-label="สถิติฐานข้อมูล">
              <div className="stat-row">
                <span>บันทึกการเก็บ</span>
                <span className="stat-value">{stats.records.toLocaleString("en-US")}</span>
              </div>
              <div className="stat-row">
                <span>ชนิดมด</span>
                <span className="stat-value">{stats.species}</span>
              </div>
              <div className="stat-row">
                <span>สถานที่</span>
                <span className="stat-value">{stats.locations}</span>
              </div>
              <p className="stats-note">นับเฉพาะบันทึกที่อนุมัติแล้ว</p>
            </aside>
          </div>
        </section>

        <section className="section container" aria-labelledby="recent-title">
          <div className="section-head">
            <div>
              <h2 id="recent-title">บันทึกล่าสุด</h2>
              <p>ข้อมูลที่ได้รับการอนุมัติล่าสุด {records.length} รายการ</p>
            </div>
            <Link href="/records" className="link-more">
              ดูทั้งหมด →
            </Link>
          </div>

          <div className="record-grid">
            {records.map((r) => (
              <Link key={r.id} href={`/records/${r.id}`} className="record-card">
                <div className="record-thumb">
                  <AntIcon size={52} />
                </div>
                <span className="badge-count">{r.count} ตัว</span>
                <div className="record-body">
                  <h3 className="record-title">{r.commonName}</h3>
                  <p className="sci">{r.scientificName}</p>
                  <p className="record-place">{r.location}</p>
                  <p className="record-meta">
                    เก็บเมื่อ {r.collectedAt} · {r.method}
                  </p>
                  <div className="record-author">
                    <span className="avatar avatar-sm" aria-hidden="true">
                      {initials(r.author)}
                    </span>
                    โดย {r.author}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {!loggedIn && (
          <section className="container">
            <div className="join">
              <h2>ร่วมบันทึกข้อมูลมด</h2>
              <p className="join-sub">3 ขั้นตอน จากสมัครสมาชิกถึงข้อมูลที่เผยแพร่</p>

              <ol className="steps" style={{ listStyle: "none", padding: 0 }}>
                {steps.map((s, i) => (
                  <li key={s.title} className="step">
                    <div className="step-no">{i + 1}</div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>

              <div className="join-actions">
                <Link href="/register" className="btn btn-primary">
                  สมัครสมาชิกฟรี
                </Link>
                <Link href="/records" className="btn btn-outline">
                  เริ่มจากการสำรวจข้อมูล
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
