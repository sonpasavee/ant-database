import Link from "next/link";
import AntIcon from "../components/ant-icon";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="auth-bar">
        <div className="container navbar-inner">
          <Link href="/" className="brand">
            <AntIcon size={28} />
            Ant Database
          </Link>
          <Link href="/" className="back-link">
            ← กลับหน้าแรก
          </Link>
        </div>
      </header>
      <main className="auth-main">{children}</main>
    </>
  );
}
