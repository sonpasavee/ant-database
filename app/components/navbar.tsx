import Link from "next/link";
import { auth, signOut } from "@/auth";
import NavLinks from "./nav-links";

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("");
  return Array.from(parts[0])[0] + Array.from(parts[1])[0];
}

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  const items = [
    { href: "/", label: "หน้าแรก" },
    { href: "/records", label: "รายการข้อมูลมด" },
    ...(user ? [{ href: "/my-records", label: "ข้อมูลของฉัน" }] : []),
    ...(user?.role === "ADMIN"
      ? [
          { href: "/admin/review", label: "คิวตรวจข้อมูล" },
          { href: "/admin", label: "จัดการข้อมูล" },
        ]
      : []),
  ];

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="brand">
          Ant Database
        </Link>

        <NavLinks items={items} />

        <div className="nav-actions">
          {user ? (
            <>
              <Link href="/records/new" className="btn btn-secondary">
                + เพิ่มข้อมูลมด
              </Link>
              <div className="nav-user">
                <span className="avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="nav-name">{user.name ?? user.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="signout">
                    ออกจากระบบ
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-login">
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" className="btn btn-secondary">
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
