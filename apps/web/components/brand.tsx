import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="SkillFlow AI, inicio">
    <Image src="/brand/isotipo.svg" alt="" width={34} height={34} priority />
    <span>SkillFlow <strong>AI</strong></span>
  </Link>;
}
