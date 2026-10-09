import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import AuthForm from "../../components/auth-form";

export const metadata = { title: "เข้าสู่ระบบ · Ant Database" };
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  await connection();
  // ล็อกอินอยู่แล้วไม่ต้องเห็นหน้านี้ → ไปหน้าแรกฝั่ง server
  const session = await auth();
  if (session?.user) redirect("/");

  const { registered } = await searchParams;

  return (
    <AuthForm
      mode="login"
      notice={
        registered
          ? "สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ"
          : undefined
      }
    />
  );
}
