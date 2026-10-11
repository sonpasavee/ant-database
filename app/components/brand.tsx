import Image from "next/image";
import Link from "next/link";
import logo from "@/app/icon.png";

export default function Brand() {
  return (
    <Link href="/" className="brand">
      <Image
        className="brand-mark"
        src={logo}
        alt=""
        aria-hidden="true"
        priority
      />
      <span>Ant Database</span>
    </Link>
  );
}
