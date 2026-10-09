import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="auth-bar">
        <div className="container navbar-inner">
          <Link href="/" className="brand">
            Ant Database
          </Link>
          <Link href="/" className="back-link">
            ← กลับหน้าแรก
          </Link>
        </div>
      </header>
      <main className="auth-main">
        <div className="auth-layout">
          <section className="auth-intro" aria-labelledby="auth-intro-title">
            <p className="auth-eyebrow">ANT DATABASE · FIELD OBSERVATIONS</p>
            <h1 id="auth-intro-title">ข้อมูลมดภาคสนาม ที่ค้นหาและแบ่งปันได้</h1>
            <p className="auth-intro-copy">
              บันทึกการสำรวจพร้อมพิกัด ค้นหาชนิดมด และติดตามจุดที่พบจากแผนที่
              ในฐานข้อมูลเดียว
            </p>
            <ul className="auth-highlights">
              <li>จัดเก็บข้อมูลการสำรวจอย่างเป็นระบบ</li>
              <li>ค้นหาชนิดและตำแหน่งที่พบได้สะดวก</li>
              <li>ส่งข้อมูลให้ผู้ดูแลตรวจสอบก่อนเผยแพร่</li>
            </ul>
          </section>
          <div className="auth-panel">{children}</div>
        </div>
      </main>
    </>
  );
}
