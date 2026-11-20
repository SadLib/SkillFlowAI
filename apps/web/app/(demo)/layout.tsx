import { DemoState } from "@/components/demo-state";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoState>{children}</DemoState>;
}
