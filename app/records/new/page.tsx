import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AntForm from "../../components/ant-form";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import LoadingIndicator from "../../components/loading-indicator";

export const metadata = { title: "เพิ่มข้อมูลมด · Ant Database" };

export default function NewRecordPage() {
  return <Suspense fallback={<LoadingIndicator label="กำลังเตรียมแบบฟอร์ม..." />}><NewRecordContent /></Suspense>;
}

async function NewRecordContent() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="page-main">
        <AntForm userId={session.user.id} />
      </main>
      <Footer />
    </>
  );
}
