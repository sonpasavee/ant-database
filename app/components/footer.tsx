import Link from "next/link";

const navigation = [
  { href: "/records", label: "สำรวจข้อมูลมด" },
  { href: "/records/new", label: "เพิ่มบันทึกการพบมด" },
  { href: "/my-records", label: "ข้อมูลของฉัน" },
];

const account = [
  { href: "/login", label: "เข้าสู่ระบบ" },
  { href: "/register", label: "สมัครสมาชิก" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-main">
          <section className="footer-brand" aria-labelledby="footer-brand-title">
            <Link className="footer-brand-name" href="/" id="footer-brand-title">
              Ant Database
            </Link>
            <p>
              พื้นที่สำหรับบันทึก รวบรวม และสำรวจข้อมูลการพบมด
              บันทึกจากผู้ใช้ทั่วไปจะเข้าสู่ขั้นตอนตรวจสอบก่อนเผยแพร่
            </p>
          </section>

          <nav className="footer-nav" aria-label="ลิงก์สำรวจข้อมูล">
            <h2>สำรวจข้อมูล</h2>
            <ul>
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-nav" aria-label="ลิงก์บัญชีผู้ใช้">
            <h2>บัญชีผู้ใช้</h2>
            <ul>
              {account.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <section className="footer-credit" aria-labelledby="footer-credit-title">
            <h2 id="footer-credit-title">แผนที่และข้อมูล</h2>
            <p>
              แผนที่ใช้ข้อมูลจาก OpenStreetMap
              โปรดดูเครดิตผู้ร่วมจัดทำข้อมูลบนแผนที่
            </p>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap contributors
              <span className="footer-external" aria-hidden="true"> ↗</span>
            </a>
          </section>
        </div>

        <div className="footer-bottom">
          <span>© {year} Ant Database</span>
          <span>ฐานข้อมูลสำหรับการบันทึกและเรียนรู้เรื่องมด</span>
        </div>
      </div>
    </footer>
  );
}
