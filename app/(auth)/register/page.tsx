import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuthForm from "../../components/auth-form";

export const metadata = { title: "สมัครสมาชิก · Ant Database" };
export const instant = false;

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return <AuthForm mode="register" />;
}
